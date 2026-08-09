'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Batch = {
  id: string;
  quantity: number;
  expiryDate: string; // ISO string
};

export type Product = {
  id: string;
  name: string;
  category: string;
  price: string;
  stock: number;
  status: string;
  batches: Batch[];
};

export type AIInsight = {
  id: string;
  title: string;
  subtitle: string;
  type: 'waste_prevented' | 'demand_spike' | 'overstock' | 'expiry_risk';
  severity: 'low' | 'medium' | 'high';
  actionPlan?: string[];
  impactValue?: number;
};

type GlobalStateContextType = {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  greenScore: number;
  setGreenScore: React.Dispatch<React.SetStateAction<number>>;
  wastePrevented: number;
  setWastePrevented: React.Dispatch<React.SetStateAction<number>>;
  insights: AIInsight[];
  setInsights: React.Dispatch<React.SetStateAction<AIInsight[]>>;
  
  // Helpers
  addProduct: (product: Product) => void;
  executeAIPlan: (insightId: string) => void;
  recordSale: (productId: string, quantity: number) => void;
};

const defaultProducts: Product[] = [
  {
    id: 'PRD-001',
    name: 'Organic Almond Milk 1L',
    category: 'Dairy Alternatives',
    price: '$4.99',
    stock: 124,
    status: 'LIVE',
    batches: [
      { id: 'B-AM-1', quantity: 24, expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() }, // 2 days
      { id: 'B-AM-2', quantity: 100, expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() }, // 14 days
    ]
  },
  {
    id: 'PRD-002',
    name: 'Whole Wheat Bread',
    category: 'Bakery',
    price: '$3.49',
    stock: 12,
    status: 'STDBY',
    batches: [
      { id: 'B-WWB-1', quantity: 12, expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() }, // 5 days
    ]
  },
  {
    id: 'PRD-003',
    name: 'Avocado (Hass) - 4 Pack',
    category: 'Produce',
    price: '$5.99',
    stock: 8,
    status: 'STDBY',
    batches: [
      { id: 'B-AVO-1', quantity: 8, expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() }, // 3 days
    ]
  },
  {
    id: 'PRD-004',
    name: 'Free Range Eggs - 12ct',
    category: 'Dairy',
    price: '$6.49',
    stock: 89,
    status: 'LIVE',
    batches: [
      { id: 'B-EGG-1', quantity: 89, expiryDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString() }, // 21 days
    ]
  },
  {
    id: 'PRD-005',
    name: 'Organic Spinach 5oz',
    category: 'Produce',
    price: '$3.99',
    stock: 45,
    status: 'LIVE',
    batches: [
      { id: 'B-SPN-1', quantity: 45, expiryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString() }, // 6 days
    ]
  },
];

const defaultInsights: AIInsight[] = [
  {
    id: 'INS-001',
    title: 'EXPIRY_RISK: Organic Almond Milk',
    subtitle: '24 units expiring in 2 days. Potential loss: $119.76',
    type: 'expiry_risk',
    severity: 'high',
    actionPlan: [
      'Apply 25% discount to Batch B-AM-1',
      'Move to front-of-store display',
      'Notify local cafe partners via WhatsApp'
    ],
    impactValue: 119.76
  },
  {
    id: 'INS-002',
    title: 'OVERSTOCK_DETECTED: Fair Trade Coffee',
    subtitle: '5.8 months of inventory. Reduce next purchase.',
    type: 'overstock',
    severity: 'medium',
    actionPlan: [
      'Pause supplier recurring order',
      'Transfer 30 units to Store #2'
    ],
    impactValue: 450.00
  }
];

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

export function GlobalStateProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(defaultProducts);
  const [greenScore, setGreenScore] = useState(84);
  const [wastePrevented, setWastePrevented] = useState(11240); // in dollars
  const [insights, setInsights] = useState<AIInsight[]>(defaultInsights);

  const addProduct = (product: Product) => {
    setProducts(prev => [product, ...prev]);
  };

  const executeAIPlan = (insightId: string) => {
    const insight = insights.find(i => i.id === insightId);
    if (!insight) return;

    // Simulate executing the plan:
    // 1. Remove the insight
    setInsights(prev => prev.filter(i => i.id !== insightId));
    
    // 2. Increase green score and waste prevented
    if (insight.impactValue) {
      setWastePrevented(prev => prev + insight.impactValue!);
      setGreenScore(prev => Math.min(100, prev + 2)); // Bump green score by 2
    }
  };

  const recordSale = (productId: string, quantity: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      
      let remainingToDeduct = quantity;
      // Sort batches by expiry date (FEFO - First Expiring First Out)
      const sortedBatches = [...p.batches].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
      
      const newBatches = sortedBatches.map(b => {
        if (remainingToDeduct <= 0) return b;
        
        if (b.quantity >= remainingToDeduct) {
          const updatedBatch = { ...b, quantity: b.quantity - remainingToDeduct };
          remainingToDeduct = 0;
          return updatedBatch;
        } else {
          remainingToDeduct -= b.quantity;
          return { ...b, quantity: 0 };
        }
      }).filter(b => b.quantity > 0);

      return {
        ...p,
        stock: Math.max(0, p.stock - quantity),
        batches: newBatches
      };
    }));
  };

  return (
    <GlobalStateContext.Provider value={{
      products, setProducts,
      greenScore, setGreenScore,
      wastePrevented, setWastePrevented,
      insights, setInsights,
      addProduct, executeAIPlan, recordSale
    }}>
      {children}
    </GlobalStateContext.Provider>
  );
}

export function useGreenQuant() {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error('useGreenQuant must be used within a GlobalStateProvider');
  }
  return context;
}
