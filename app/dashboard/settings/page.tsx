"use client";
import RoleGate from '@/components/layout/RoleGate';


import React, { useState, useEffect } from "react";
import { Store, User, Shield, Plus, MoreHorizontal, Edit, Trash2, Mail, Phone, MapPin } from "lucide-react";
import { getCurrentUser } from "@/lib/api-client";
import type { UserOut } from "@/lib/backend-types";

function SettingsPageContent() {
  const [activeTab, setActiveTab] = useState("store");
  const [user, setUser] = useState<UserOut | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Settings</h2>
          <p className="text-sm text-slate-500">Manage your store details, users, and roles.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: "store", label: "Store Details", icon: Store },
          { id: "users", label: "User Management", icon: User },
          { id: "roles", label: "Roles & Permissions", icon: Shield },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-green-600 text-green-700 bg-green-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-4">
        {activeTab === "store" && (
          <div className="max-w-2xl space-y-6">
            <div className="glass-panel p-6">
              <h3 className="text-base font-bold text-slate-800 mb-6">General Information</h3>
              <form className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Store Name</label>
                    <input type="text" defaultValue={"GreenShop AI"} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Store ID</label>
                    <input type="text" defaultValue={user?.id || "GS-01"} disabled className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Contact Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="email" defaultValue={user?.email || "contact@greenshop.ai"} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" defaultValue="" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <textarea rows={3} defaultValue="" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"></textarea>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button type="button" className="bg-[#0FA958] hover:bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800">Team Members</h3>
            </div>
            <div className="glass-panel overflow-hidden">
              <div className="p-6 text-center text-slate-500 text-sm">
                User management coming soon.
              </div>
            </div>
          </div>
        )}

        {activeTab === "roles" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Roles List */}
            <div className="glass-panel p-4 md:col-span-1 h-fit">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800">Available Roles</h3>
                <button className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md transition-colors"><Plus className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                {['Admin', 'Store Manager', 'Inventory Clerk', 'Cashier'].map((role, i) => (
                  <button key={i} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${i === 1 ? 'bg-green-50 text-green-700 border border-green-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}>
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Editor */}
            <div className="glass-panel p-6 md:col-span-2">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Role: Store Manager</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage permissions for this role.</p>
                </div>
                <button className="text-red-500 hover:text-red-600 text-sm font-semibold flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4" /> Delete Role
                </button>
              </div>

              <div className="space-y-4">
                {['Inventory Management', 'Sales & Reports', 'User Management', 'Settings Configuration'].map((module, i) => (
                  <div key={i} className="border border-slate-100 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-slate-800 mb-3">{module}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {['View', 'Create', 'Edit', 'Delete'].map((perm, j) => (
                        <label key={j} className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            defaultChecked={j < 3 || i < 2} 
                            className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500 cursor-pointer" 
                          />
                          <span className="text-sm text-slate-600">{perm}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-6 mt-6 border-t border-slate-100">
                <button className="bg-[#0FA958] hover:bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">
                  Save Permissions
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


export default function SettingsPage() {
  return (
    <RoleGate module="settings">
      <SettingsPageContent />
    </RoleGate>
  );
}
