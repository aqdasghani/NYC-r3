"use client";

import React, { useState } from "react";
import { 
  Plus, Search, Edit2, Trash2, Barcode, X, Package, Check, 
  MoreVertical, Filter, Download
} from "lucide-react";

// Mock Data
const MOCK_PRODUCTS = [
  { id: "PRD-001", name: "Organic Green Tea", sku: "OGT-100", category: "Beverages", stock: 150, price: 450, status: "In Stock" },
  { id: "PRD-002", name: "Vegan Protein Powder", sku: "VPP-500", category: "Supplements", stock: 12, price: 1200, status: "Low Stock" },
  { id: "PRD-003", name: "Almond Milk 1L", sku: "ALM-1L", category: "Dairy Alternatives", stock: 0, price: 280, status: "Out of Stock" },
  { id: "PRD-004", name: "Gluten-Free Oats", sku: "GFO-250", category: "Pantry", stock: 85, price: 150, status: "In Stock" },
  { id: "PRD-005", name: "Cold Pressed Olive Oil", sku: "CPO-500", category: "Oils", stock: 34, price: 850, status: "In Stock" },
];

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-green" />
            Products
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your inventory, pricing, and product details.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-semibold border border-slate-200"
          >
            <Barcode className="w-4 h-4" />
            Scan Barcode
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-colors text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, SKU, or category..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium border border-slate-200">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium border border-slate-200">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-semibold">Product Name</th>
                <th className="px-6 py-4 font-semibold">SKU</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold text-right">Price (₹)</th>
                <th className="px-6 py-4 font-semibold text-right">Stock</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_PRODUCTS.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{product.name}</div>
                    <div className="text-xs text-slate-500">{product.id}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{product.sku}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                    {product.price.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-medium ${product.stock < 20 ? (product.stock === 0 ? 'text-red-500' : 'text-orange-500') : 'text-slate-700'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                      product.status === 'In Stock' ? 'bg-green-100 text-green-700' :
                      product.status === 'Low Stock' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        product.status === 'In Stock' ? 'bg-green-500' :
                        product.status === 'Low Stock' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}></span>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-brand-blue hover:bg-blue-50 rounded-md transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">Showing 1 to 5 of 5 entries</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-400 cursor-not-allowed">Previous</button>
            <button className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>

      {/* Add Product Modal (Mock) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Add New Product</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Product Name</label>
                  <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" placeholder="e.g. Premium Arabica Coffee" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">SKU</label>
                  <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" placeholder="e.g. COF-001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green">
                    <option>Beverages</option>
                    <option>Pantry</option>
                    <option>Supplements</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Price (₹)</label>
                  <input type="number" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Initial Stock</label>
                  <input type="number" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" placeholder="0" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-colors text-sm font-semibold shadow-sm flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal (Mock) */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 flex justify-between items-center absolute w-full top-0 z-10">
              <h3 className="text-white font-bold drop-shadow-md">Scan Barcode</h3>
              <button 
                onClick={() => setIsScannerOpen(false)}
                className="p-1.5 text-white hover:bg-white/20 rounded-full transition-colors backdrop-blur-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative aspect-square bg-slate-900 flex items-center justify-center overflow-hidden">
              {/* Mock camera feed */}
              <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1607344645866-009c320b63e0?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center"></div>
              
              {/* Scanning UI overlay */}
              <div className="relative z-10 w-64 h-64 border-2 border-brand-green/50 rounded-xl flex items-center justify-center">
                <div className="absolute w-full h-0.5 bg-brand-green top-1/2 -translate-y-1/2 shadow-[0_0_10px_#0FA958] animate-pulse"></div>
                
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-green rounded-tl"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand-green rounded-tr"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-brand-green rounded-bl"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand-green rounded-br"></div>
              </div>
            </div>
            <div className="p-6 bg-white text-center">
              <p className="text-sm text-slate-600 mb-4">Position the barcode inside the frame to scan automatically.</p>
              <div className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-brand-green bg-green-50 py-2 px-4 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-brand-green animate-ping"></div>
                Camera Active
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
