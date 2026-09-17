import React, { useState } from 'react';
import { Product } from '../types';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  FileText, 
  RefreshCw 
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface AdminImportProps {
  existingProducts: Product[];
  onImportProducts: (products: any[]) => Promise<boolean>;
}

export const AdminImport: React.FC<AdminImportProps> = ({
  existingProducts,
  onImportProducts,
}) => {
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    code: 'code',
    name: 'name',
    presentation: 'presentation',
    category: 'category',
    salePrice: 'salePrice',
    costPrice: 'costPrice',
    currentStock: 'currentStock',
  });
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Read file using XLSX (supports .csv, .xlsx, .xls)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          setErrorMessage('Nenhuma linha encontrada no arquivo selecionado.');
          return;
        }

        setParsedRows(data);
      } catch (err: any) {
        setErrorMessage(`Falha ao ler arquivo: ${err.message}`);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Process rows into Product models
  const handleConfirmImport = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const formatted = parsedRows.map((row) => {
        const code = String(row[columnMapping.code] || row['Código'] || row['codigo'] || row['COD'] || `IMP-${Math.floor(1000 + Math.random() * 9000)}`);
        const name = String(row[columnMapping.name] || row['Produto'] || row['Nome'] || row['descricao'] || 'Medicamento sem nome');
        const presentation = row[columnMapping.presentation] || row['Apresentação'] || row['dosagem'] || '';
        const category = row[columnMapping.category] || row['Categoria'] || 'Medicamentos';
        const salePrice = Number(row[columnMapping.salePrice] || row['Preço'] || row['preco_venda'] || 0);
        const costPrice = Number(row[columnMapping.costPrice] || row['Custo'] || row['preco_custo'] || 0);
        const currentStock = Number(row[columnMapping.currentStock] || row['Estoque'] || row['saldo'] || 0);

        return {
          code,
          name,
          presentation,
          category,
          salePrice,
          costPrice,
          currentStock,
          minStock: 5,
          maxStock: 30,
          unit: 'cx',
          active: true,
        };
      });

      const success = await onImportProducts(formatted);
      if (success) {
        setSuccessMessage(`${formatted.length} itens processados e reconciliados com sucesso no catálogo!`);
        setParsedRows([]);
        setFileName(null);
      } else {
        setErrorMessage('Erro ao persistir produtos importados no servidor.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro durante a importação.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download Sample Template CSV
  const handleDownloadSample = () => {
    const sample = [
      {
        codigo: 'MED-1001',
        produto: 'Dipirona Monoidratada',
        apresentacao: '500mg c/ 20 comprimidos',
        categoria: 'Medicamentos',
        preco_venda: 14.50,
        preco_custo: 5.80,
        estoque: 25,
      },
      {
        codigo: 'GEN-2002',
        produto: 'Amoxicilina + Clavulanato',
        apresentacao: '500mg+125mg 21 comp',
        categoria: 'Genéricos',
        preco_venda: 48.90,
        preco_custo: 22.00,
        estoque: 12,
      },
      {
        codigo: 'COR-3003',
        produto: 'Fita Microporosa Cirúrgica',
        apresentacao: '25mm x 10m',
        categoria: 'Correlatos',
        preco_venda: 12.00,
        preco_custo: 4.50,
        estoque: 15,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo_FarmaVida');
    XLSX.writeFile(wb, 'modelo_importacao_farmavida.xlsx');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-700" />
            <span>Importação & Conciliação de Planilhas</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Importe dados de produtos, estoques ou planilhas do seu sistema satélite com detecção de novos itens e atualizações.
          </p>
        </div>

        <button
          onClick={handleDownloadSample}
          className="px-3.5 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Download className="w-4 h-4 text-emerald-700" />
          <span>Baixar Modelo (.xlsx)</span>
        </button>
      </div>

      {/* Upload Zone */}
      <div className="bg-white rounded-xl border border-dashed border-neutral-300 p-8 text-center hover:border-emerald-500 transition-colors">
        <Upload className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
        <h3 className="font-bold text-neutral-900 text-sm">
          Selecione uma planilha de catálogo (.xlsx, .xls ou .csv)
        </h3>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
          Arraste e solte o arquivo ou clique para escolher do seu computador.
        </p>

        <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white font-semibold text-xs rounded-lg hover:bg-emerald-800 cursor-pointer transition-colors shadow-xs">
          <span>Escolher Arquivo</span>
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {fileName && (
          <div className="mt-3 text-xs font-medium text-emerald-800 bg-emerald-50 py-1.5 px-3 rounded-md inline-block">
            Arquivo carregado: {fileName} ({parsedRows.length} linhas detectadas)
          </div>
        )}
      </div>

      {/* Feedback alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Preview Table if rows parsed */}
      {parsedRows.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-neutral-900 text-sm">
              Pré-Visualização dos Dados Carregados ({parsedRows.length} registros)
            </h3>

            <button
              onClick={handleConfirmImport}
              disabled={isProcessing}
              className="px-4 py-2 bg-emerald-700 text-white font-bold text-xs rounded-lg hover:bg-emerald-800 transition-colors shadow-xs flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Importando...' : 'Confirmar & Reconciliar no Catálogo'}</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-96 border border-neutral-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 text-neutral-600 font-semibold sticky top-0">
                <tr>
                  {Object.keys(parsedRows[0] || {}).map((header, idx) => (
                    <th key={idx} className="py-2.5 px-3 whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-neutral-800">
                {parsedRows.slice(0, 15).map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-neutral-50">
                    {Object.values(row).map((val: any, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 whitespace-nowrap">
                        {String(val ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {parsedRows.length > 15 && (
            <div className="text-center text-[11px] text-neutral-400">
              Exibindo as primeiras 15 linhas de {parsedRows.length} encontradas.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
