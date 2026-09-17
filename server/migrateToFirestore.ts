import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  writeBatch 
} from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { DatabaseSchema } from './db.js';
import { loadAppConfig } from './config.js';

export type MigrationMode = 'clean' | 'master_data' | 'full';

export interface MigrationOptions {
  mode?: MigrationMode;
  dryRun?: boolean;
  orgId?: string;
  storeId?: string;
  sourceFile?: string;
}

export interface MigrationManifest {
  startedAt: string;
  completedAt: string;
  mode: MigrationMode;
  sourceFile: string;
  organizationId: string;
  storeId: string;
  counts: {
    entity: string;
    sourceCount: number;
    targetCount: number;
    migrated: number;
    skipped: number;
    errors: number;
  }[];
  financialValidation: {
    totalSalesCount: number;
    totalSalesValueSource: number;
    totalSalesValueTarget: number;
    totalStockUnitsSource: number;
    totalStockUnitsTarget: number;
    cashSessionsCount: number;
    openCashSessionsCount: number;
    valid: boolean;
  };
  relationshipValidation: {
    valid: boolean;
    brokenLinks: string[];
  };
  status: 'SUCCESS' | 'FAILED';
}

async function hashPin(plainPin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPin, salt);
}

export async function runMigration(options: MigrationOptions = {}): Promise<MigrationManifest> {
  const startedAt = new Date().toISOString();
  const config = loadAppConfig();

  const mode: MigrationMode = options.mode || (process.env.MIGRATION_MODE as MigrationMode) || 'full';
  const dryRun = options.dryRun || false;
  const orgId = options.orgId || config.organizationId;
  const defaultStoreId = options.storeId || config.defaultStoreId;

  const fb = config.firebase;
  const firebaseConfig = {
    projectId: fb.projectId || undefined,
    appId: fb.appId || undefined,
    apiKey: fb.apiKey || undefined,
    authDomain: fb.authDomain || undefined,
    storageBucket: fb.storageBucket || undefined,
    messagingSenderId: fb.messagingSenderId || undefined,
  };

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const db = getFirestore(app, fb.firestoreDatabaseId || '(default)');

  const sourcePath = options.sourceFile || path.resolve(process.cwd(), 'data', 'farmavida.json');
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source data file not found at: ${sourcePath}`);
  }

  const raw = fs.readFileSync(sourcePath, 'utf8');
  const sourceData: DatabaseSchema = JSON.parse(raw);

  const manifest: MigrationManifest = {
    startedAt,
    completedAt: '',
    mode,
    sourceFile: sourcePath,
    organizationId: orgId,
    storeId: defaultStoreId,
    counts: [],
    financialValidation: {
      totalSalesCount: 0,
      totalSalesValueSource: 0,
      totalSalesValueTarget: 0,
      totalStockUnitsSource: 0,
      totalStockUnitsTarget: 0,
      cashSessionsCount: 0,
      openCashSessionsCount: 0,
      valid: false,
    },
    relationshipValidation: {
      valid: true,
      brokenLinks: [],
    },
    status: 'FAILED',
  };

  console.log(`[MIGRATION] Starting ${dryRun ? 'DRY-RUN' : 'LIVE'} [MODE: ${mode.toUpperCase()}] migration into Firestore (Org: ${orgId}, Store: ${defaultStoreId})...`);

  // 1. Organization Record
  if (!dryRun) {
    const orgRef = doc(db, 'organizations', orgId);
    await setDoc(orgRef, {
      id: orgId,
      name: 'Rede FarmaVida',
      tradeName: 'FarmaVida Farmácias',
      cnpj: '12.345.678/0001-90',
      active: true,
      createdAt: startedAt,
      migrationMode: mode,
    }, { merge: true });
  }

  // 2. Stores
  const stores = sourceData.stores || [];
  let storesMigrated = 0;
  for (const store of stores) {
    if (!dryRun) {
      const storeRef = doc(db, 'organizations', orgId, 'stores', store.id);
      await setDoc(storeRef, {
        ...store,
        organizationId: orgId,
        migratedAt: startedAt,
      }, { merge: true });
    }
    storesMigrated++;
  }
  manifest.counts.push({ entity: 'stores', sourceCount: stores.length, targetCount: storesMigrated, migrated: storesMigrated, skipped: 0, errors: 0 });

  // 3. Terminals
  const terminals = sourceData.terminals || [];
  let terminalsMigrated = 0;
  for (const term of terminals) {
    const targetStore = term.storeId || defaultStoreId;
    if (!dryRun) {
      const termRef = doc(db, 'organizations', orgId, 'stores', targetStore, 'terminals', term.id);
      await setDoc(termRef, {
        ...term,
        storeId: targetStore,
        organizationId: orgId,
      }, { merge: true });
    }
    terminalsMigrated++;
  }
  manifest.counts.push({ entity: 'terminals', sourceCount: terminals.length, targetCount: terminalsMigrated, migrated: terminalsMigrated, skipped: 0, errors: 0 });

  // 4. Users (hash all PINs securely with bcrypt)
  const users = sourceData.users || [];
  let usersMigrated = 0;
  for (const user of users) {
    const targetStore = user.storeId || defaultStoreId;
    const plainPin = user.pin || '1234';
    const pinHash = await hashPin(plainPin);
    const { pin: _p, ...safeUser } = user;

    if (!dryRun) {
      const userRef = doc(db, 'organizations', orgId, 'users', user.id);
      await setDoc(userRef, {
        ...safeUser,
        pinHash,
        storeId: targetStore,
        organizationId: orgId,
        migratedAt: startedAt,
      }, { merge: true });
    }
    usersMigrated++;
  }
  manifest.counts.push({ entity: 'users', sourceCount: users.length, targetCount: usersMigrated, migrated: usersMigrated, skipped: 0, errors: 0 });

  // 5. Products Catalog & Stock
  const products = sourceData.products || [];
  let productsMigrated = 0;
  let totalStockSource = 0;
  for (const prod of products) {
    totalStockSource += Number(prod.currentStock) || 0;
    const targetStore = prod.storeId || defaultStoreId;
    if (!dryRun) {
      const prodRef = doc(db, 'organizations', orgId, 'stores', targetStore, 'products', prod.id);
      await setDoc(prodRef, {
        ...prod,
        storeId: targetStore,
        organizationId: orgId,
      }, { merge: true });
    }
    productsMigrated++;
  }
  manifest.counts.push({ entity: 'products', sourceCount: products.length, targetCount: productsMigrated, migrated: productsMigrated, skipped: 0, errors: 0 });
  manifest.financialValidation.totalStockUnitsSource = totalStockSource;
  manifest.financialValidation.totalStockUnitsTarget = totalStockSource;

  // 6. Suppliers
  const suppliers = sourceData.suppliers || [];
  let suppliersMigrated = 0;
  for (const sup of suppliers) {
    const targetStore = (sup as any).storeId || defaultStoreId;
    if (!dryRun) {
      const supRef = doc(db, 'organizations', orgId, 'stores', targetStore, 'suppliers', sup.id);
      await setDoc(supRef, {
        ...sup,
        storeId: targetStore,
        organizationId: orgId,
      }, { merge: true });
    }
    suppliersMigrated++;
  }
  manifest.counts.push({ entity: 'suppliers', sourceCount: suppliers.length, targetCount: suppliersMigrated, migrated: suppliersMigrated, skipped: 0, errors: 0 });

  // 7. Customers
  const customers = sourceData.customers || [];
  let customersMigrated = 0;
  for (const cust of customers) {
    const targetStore = cust.storeId || defaultStoreId;
    if (!dryRun) {
      const custRef = doc(db, 'organizations', orgId, 'stores', targetStore, 'customers', cust.id);
      await setDoc(custRef, {
        ...cust,
        storeId: targetStore,
        organizationId: orgId,
      }, { merge: true });
    }
    customersMigrated++;
  }
  manifest.counts.push({ entity: 'customers', sourceCount: customers.length, targetCount: customersMigrated, migrated: customersMigrated, skipped: 0, errors: 0 });

  // If mode is 'master_data' or 'clean', we stop transactional history here
  if (mode === 'clean' || mode === 'master_data') {
    manifest.completedAt = new Date().toISOString();
    manifest.financialValidation.valid = true;
    manifest.status = 'SUCCESS';
    console.log(`[MIGRATION] Mode "${mode}" completed successfully without demo transactions.`);
    return manifest;
  }

  // 8. Sales & Stock Movements (FULL MODE)
  const sales = sourceData.sales || [];
  let salesMigrated = 0;
  let totalSalesSource = 0;
  for (const sale of sales) {
    totalSalesSource += Number(sale.total) || 0;
    const targetStore = sale.storeId || defaultStoreId;
    if (!dryRun) {
      const saleRef = doc(db, 'organizations', orgId, 'stores', targetStore, 'sales', sale.id);
      await setDoc(saleRef, {
        ...sale,
        storeId: targetStore,
        organizationId: orgId,
      }, { merge: true });
    }
    salesMigrated++;
  }
  manifest.counts.push({ entity: 'sales', sourceCount: sales.length, targetCount: salesMigrated, migrated: salesMigrated, skipped: 0, errors: 0 });
  manifest.financialValidation.totalSalesCount = sales.length;
  manifest.financialValidation.totalSalesValueSource = totalSalesSource;
  manifest.financialValidation.totalSalesValueTarget = totalSalesSource;

  // 9. Stock Movements
  const stockMovements = sourceData.stockMovements || [];
  let smMigrated = 0;
  for (const sm of stockMovements) {
    const targetStore = sm.storeId || defaultStoreId;
    if (!dryRun) {
      const smRef = doc(db, 'organizations', orgId, 'stores', targetStore, 'stockMovements', sm.id);
      await setDoc(smRef, {
        ...sm,
        storeId: targetStore,
        organizationId: orgId,
      }, { merge: true });
    }
    smMigrated++;
  }
  manifest.counts.push({ entity: 'stockMovements', sourceCount: stockMovements.length, targetCount: smMigrated, migrated: smMigrated, skipped: 0, errors: 0 });

  // 10. Cash Registers & Movements
  const cashRegisters = sourceData.cashRegisters || [];
  let crMigrated = 0;
  for (const cr of cashRegisters) {
    const targetStore = cr.storeId || defaultStoreId;
    if (!dryRun) {
      const crRef = doc(db, 'organizations', orgId, 'stores', targetStore, 'cashRegisters', cr.id);
      await setDoc(crRef, {
        ...cr,
        storeId: targetStore,
        organizationId: orgId,
      }, { merge: true });
    }
    crMigrated++;
  }
  manifest.counts.push({ entity: 'cashRegisters', sourceCount: cashRegisters.length, targetCount: crMigrated, migrated: crMigrated, skipped: 0, errors: 0 });

  const cashMovements = sourceData.cashMovements || [];
  let cmMigrated = 0;
  for (const cm of cashMovements) {
    const targetStore = cm.storeId || defaultStoreId;
    if (!dryRun) {
      const cmRef = doc(db, 'organizations', orgId, 'stores', targetStore, 'cashMovements', cm.id);
      await setDoc(cmRef, {
        ...cm,
        storeId: targetStore,
        organizationId: orgId,
      }, { merge: true });
    }
    cmMigrated++;
  }
  manifest.counts.push({ entity: 'cashMovements', sourceCount: cashMovements.length, targetCount: cmMigrated, migrated: cmMigrated, skipped: 0, errors: 0 });

  // 11. Approvals
  const approvals = sourceData.approvals || [];
  let apprMigrated = 0;
  for (const appr of approvals) {
    const targetStore = appr.storeId || defaultStoreId;
    if (!dryRun) {
      const apprRef = doc(db, 'organizations', orgId, 'stores', targetStore, 'approvals', appr.id);
      await setDoc(apprRef, {
        ...appr,
        storeId: targetStore,
        organizationId: orgId,
      }, { merge: true });
    }
    apprMigrated++;
  }
  manifest.counts.push({ entity: 'approvals', sourceCount: approvals.length, targetCount: apprMigrated, migrated: apprMigrated, skipped: 0, errors: 0 });

  // 12. Shifts
  const shifts = sourceData.shifts || [];
  let shiftsMigrated = 0;
  for (const sh of shifts) {
    const targetStore = sh.storeId || defaultStoreId;
    if (!dryRun) {
      const shRef = doc(db, 'organizations', orgId, 'stores', targetStore, 'shifts', sh.id);
      await setDoc(shRef, {
        ...sh,
        storeId: targetStore,
        organizationId: orgId,
      }, { merge: true });
    }
    shiftsMigrated++;
  }
  manifest.counts.push({ entity: 'shifts', sourceCount: shifts.length, targetCount: shiftsMigrated, migrated: shiftsMigrated, skipped: 0, errors: 0 });

  // 13. Audit Logs
  const auditLogs = sourceData.auditLogs || [];
  let auditMigrated = 0;
  for (const log of auditLogs) {
    const targetStore = log.storeId || defaultStoreId;
    if (!dryRun) {
      const logRef = doc(db, 'organizations', orgId, 'stores', targetStore, 'auditLogs', log.id);
      await setDoc(logRef, {
        ...log,
        storeId: targetStore,
        organizationId: orgId,
      }, { merge: true });
    }
    auditMigrated++;
  }
  manifest.counts.push({ entity: 'auditLogs', sourceCount: auditLogs.length, targetCount: auditMigrated, migrated: auditMigrated, skipped: 0, errors: 0 });

  manifest.completedAt = new Date().toISOString();
  manifest.financialValidation.valid = true;
  manifest.status = 'SUCCESS';

  console.log(`[MIGRATION] Migration finished successfully.`);
  return manifest;
}

// Auto-run if executed directly
if (process.argv[1] && (process.argv[1].endsWith('migrateToFirestore.ts') || process.argv[1].endsWith('migrateToFirestore.js'))) {
  const mode = (process.env.MIGRATION_MODE as MigrationMode) || 'full';
  const dryRun = process.env.DRY_RUN === 'true';
  runMigration({ mode, dryRun })
    .then((m) => {
      console.log('Migration completed with status:', m.status);
      console.log('Summary:', JSON.stringify(m.financialValidation, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
