"use client";

import React, { useState, useEffect } from "react";
import { Store, User, Shield, Plus, MoreHorizontal, Edit, Trash2, Mail, Phone, MapPin, X } from "lucide-react";

type PermissionNode = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

type Role = {
  id: string;
  name: string;
  permissions: {
    [module: string]: PermissionNode;
  };
};

type UserType = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
};

const INITIAL_ROLES: Role[] = [
  {
    id: "r1",
    name: "Owner",
    permissions: {
      "Inventory Management": { view: true, create: true, edit: true, delete: true },
      "Sales & Reports": { view: true, create: true, edit: true, delete: true },
      "User Management": { view: true, create: true, edit: true, delete: true },
      "Settings Configuration": { view: true, create: true, edit: true, delete: true },
    }
  },
  {
    id: "r2",
    name: "Worker",
    permissions: {
      "Inventory Management": { view: true, create: true, edit: true, delete: false },
      "Sales & Reports": { view: true, create: false, edit: false, delete: false },
      "User Management": { view: false, create: false, edit: false, delete: false },
      "Settings Configuration": { view: false, create: false, edit: false, delete: false },
    }
  },
  {
    id: "r3",
    name: "Bill",
    permissions: {
      "Inventory Management": { view: true, create: false, edit: false, delete: false },
      "Sales & Reports": { view: true, create: true, edit: false, delete: false },
      "User Management": { view: false, create: false, edit: false, delete: false },
      "Settings Configuration": { view: false, create: false, edit: false, delete: false },
    }
  }
];

// Removed INITIAL_USERS mock data

const PERMISSION_MODULES = [
  'Inventory Management',
  'Sales & Reports',
  'User Management',
  'Settings Configuration'
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("store");
  
  // State for Users
  const [users, setUsers] = useState<UserType[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "Worker", status: "Active" });

  // State for Roles
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeRoleId, setActiveRoleId] = useState<string>("r2"); // Worker selected by default
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  // State for Store Settings
  const [storeForm, setStoreForm] = useState({
    name: "GreenShop AI",
    id: "GS-01",
    phone: "+91 98765 43210",
    gst_number: "27ABCDE1234F1Z5",
    address: "123 Market Yard, Retail Hub, Bengaluru",
    city: "Bengaluru"
  });
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeSuccess, setStoreSuccess] = useState(false);

  useEffect(() => {
    import("@/lib/api-client").then(({ apiFetch }) => {
      apiFetch<any>("/api/stores/current")
        .then(s => {
          if (s) {
            setStoreForm({
              name: s.name || "GreenShop AI",
              id: s.id ? s.id.substring(0, 8).toUpperCase() : "GS-01",
              phone: s.phone || "+91 98765 43210",
              gst_number: s.gst_number || "27ABCDE1234F1Z5",
              address: s.address || "123 Market Yard, Retail Hub",
              city: s.city || "Bengaluru"
            });
          }
        })
        .catch(() => null);
    });
  }, []);

  async function handleSaveStore(e: React.FormEvent) {
    e.preventDefault();
    setStoreSaving(true);
    setStoreSuccess(false);
    try {
      const { apiFetch } = await import("@/lib/api-client");
      const updated = await apiFetch<any>("/api/stores/current", {
        method: "PUT",
        body: JSON.stringify({
          name: storeForm.name,
          phone: storeForm.phone,
          gst_number: storeForm.gst_number,
          address: storeForm.address,
          city: storeForm.city
        })
      });
      if (updated) {
        setStoreSuccess(true);
        setTimeout(() => setStoreSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save store settings");
    } finally {
      setStoreSaving(false);
    }
  }

  // Load roles (hardcoded for now as per backend) and users from API
  useEffect(() => {
    setRoles(INITIAL_ROLES);
    import("@/lib/api-client").then(({ apiFetch }) => {
      apiFetch<UserType[]>("/api/auth/users")
        .then(data => {
          if (data) setUsers(data);
        })
        .catch(err => console.error("Failed to fetch users", err));
    });
  }, []);

  const activeRole = roles.find(r => r.id === activeRoleId);

  const handleTogglePermission = (module: string, perm: keyof PermissionNode) => {
    if (!activeRole) return;
    
    setRoles(roles.map(role => {
      if (role.id === activeRoleId) {
        return {
          ...role,
          permissions: {
            ...role.permissions,
            [module]: {
              ...role.permissions[module],
              [perm]: !role.permissions[module][perm]
            }
          }
        };
      }
      return role;
    }));
  };

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    
    const newRole: Role = {
      id: `r${Date.now()}`,
      name: newRoleName,
      permissions: {
        "Inventory Management": { view: false, create: false, edit: false, delete: false },
        "Sales & Reports": { view: false, create: false, edit: false, delete: false },
        "User Management": { view: false, create: false, edit: false, delete: false },
        "Settings Configuration": { view: false, create: false, edit: false, delete: false },
      }
    };
    
    setRoles([...roles, newRole]);
    setActiveRoleId(newRole.id);
    setNewRoleName("");
    setShowAddRoleModal(false);
  };

  const handleDeleteRole = (id: string) => {
    if (roles.length <= 1) return alert("You must have at least one role.");
    const filteredRoles = roles.filter(r => r.id !== id);
    setRoles(filteredRoles);
    if (activeRoleId === id) {
      setActiveRoleId(filteredRoles[0].id);
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;
    
    setUsers([...users, { ...newUser, id: Date.now() }]);
    setNewUser({ name: "", email: "", role: "Worker", status: "Active" });
    setShowAddUserModal(false);
  };

  const handleDeleteUser = (id: number) => {
    setUsers(users.filter(u => u.id !== id));
  };

  return (
    <div className="space-y-6 pb-12 relative">
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
            <div className="glass-panel p-6 bg-bg-surface border border-border-default rounded-xl shadow-sm">
              <h3 className="text-base font-bold text-text-primary mb-6">General Information</h3>
              {storeSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg flex items-center justify-between">
                  <span>✓ Store details saved successfully! Thermal receipts will reflect your updated shop name and GST number.</span>
                </div>
              )}
              <form className="space-y-5" onSubmit={handleSaveStore}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary">Shop / Store Name</label>
                    <input 
                      type="text" 
                      required
                      value={storeForm.name} 
                      onChange={e => setStoreForm({...storeForm, name: e.target.value})}
                      className="w-full bg-slate-50 border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green font-medium" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary">Store ID</label>
                    <input 
                      type="text" 
                      value={storeForm.id} 
                      disabled 
                      className="w-full bg-slate-100 border border-border-default rounded-lg px-3 py-2 text-sm text-text-muted cursor-not-allowed font-mono" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary">GST Number (GSTIN)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 27ABCDE1234F1Z5"
                      value={storeForm.gst_number} 
                      onChange={e => setStoreForm({...storeForm, gst_number: e.target.value})}
                      className="w-full bg-slate-50 border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green font-mono uppercase" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary">Phone Number</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        value={storeForm.phone} 
                        onChange={e => setStoreForm({...storeForm, phone: e.target.value})}
                        className="w-full bg-slate-50 border border-border-default rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                    <textarea 
                      rows={3} 
                      value={storeForm.address} 
                      onChange={e => setStoreForm({...storeForm, address: e.target.value})}
                      className="w-full bg-slate-50 border border-border-default rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                    ></textarea>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    type="submit" 
                    disabled={storeSaving}
                    className="bg-brand-green hover:bg-brand-green/90 text-black px-5 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                  >
                    {storeSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-text-primary">Team Members</h3>
              <button 
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-2 bg-brand-green hover:bg-brand-green/90 text-black px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add User
              </button>
            </div>

            <div className="glass-panel overflow-hidden bg-bg-surface border border-border-default rounded-xl shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-border-default text-text-muted">
                      <th className="px-4 py-3 font-semibold">User</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default/50">
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-text-muted">
                          No users found.
                        </td>
                      </tr>
                    )}
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                            <div>
                              <div className="font-semibold text-text-primary">{user.name}</div>
                              <div className="text-xs text-text-secondary">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-secondary font-medium">
                          <span className="bg-slate-50 text-text-primary px-2.5 py-1 rounded-md text-xs border border-border-default">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                            <span className="text-text-secondary text-xs font-medium">{user.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2 text-text-muted">
                            <button className="p-1.5 hover:bg-slate-50 hover:text-brand-green transition-colors rounded-lg">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1.5 hover:bg-red-50 hover:text-red-600 transition-colors rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "roles" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Roles List */}
            <div className="glass-panel p-4 md:col-span-1 h-fit bg-bg-surface border border-border-default rounded-xl shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-text-primary">Available Roles</h3>
                <button 
                  onClick={() => setShowAddRoleModal(true)}
                  className="p-1.5 bg-slate-50 text-text-secondary hover:bg-slate-100 rounded-md transition-colors border border-border-default"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {roles.map((role) => (
                  <button 
                    key={role.id}
                    onClick={() => setActiveRoleId(role.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeRoleId === role.id 
                        ? 'bg-brand-green/20 text-brand-green border border-brand-green shadow-sm' 
                        : 'text-text-secondary hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    {role.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Editor */}
            {activeRole && (
              <div className="glass-panel p-6 md:col-span-2 bg-bg-surface border border-border-default rounded-xl shadow-sm">
                <div className="flex justify-between items-center border-b border-border-default pb-4 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-text-primary">Edit Role: {activeRole.name}</h3>
                    <p className="text-xs text-text-secondary mt-0.5">Manage permissions for this role.</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteRole(activeRole.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Role
                  </button>
                </div>

                <div className="space-y-4">
                  {PERMISSION_MODULES.map((module) => (
                    <div key={module} className="border border-border-default rounded-lg p-4 bg-slate-50/30">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-bold text-text-primary">{module}</h4>
                        <label className="flex items-center gap-2 cursor-pointer group text-xs text-text-secondary hover:text-brand-green transition-colors">
                          <input 
                            type="checkbox" 
                            checked={
                              activeRole.permissions[module]?.view &&
                              activeRole.permissions[module]?.create &&
                              activeRole.permissions[module]?.edit &&
                              activeRole.permissions[module]?.delete
                            }
                            onChange={(e) => {
                              const val = e.target.checked;
                              setRoles(roles.map(r => {
                                if (r.id === activeRole.id) {
                                  return {
                                    ...r,
                                    permissions: {
                                      ...r.permissions,
                                      [module]: { view: val, create: val, edit: val, delete: val }
                                    }
                                  }
                                }
                                return r;
                              }));
                            }}
                            className="w-3.5 h-3.5 text-brand-green bg-white border-border-default rounded focus:ring-brand-green focus:ring-offset-0 cursor-pointer" 
                          />
                          Select All
                        </label>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(['view', 'create', 'edit', 'delete'] as (keyof PermissionNode)[]).map((perm) => (
                          <label key={perm} className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative flex items-center">
                              <input 
                                type="checkbox" 
                                checked={activeRole.permissions[module]?.[perm] || false}
                                onChange={() => handleTogglePermission(module, perm)}
                                className="w-4 h-4 text-brand-green bg-white border-border-default rounded focus:ring-brand-green focus:ring-offset-0 cursor-pointer" 
                              />
                            </div>
                            <span className="text-sm text-text-secondary group-hover:text-text-primary capitalize select-none">
                              {perm}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-6 mt-6 border-t border-border-default">
                  <button 
                    onClick={() => alert('Permissions saved successfully!')}
                    className="bg-brand-green hover:bg-brand-green/90 text-black px-5 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                  >
                    Save Permissions
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-border-default flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-text-primary">Add New Team Member</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-text-muted hover:text-text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4 bg-bg-surface">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  className="w-full bg-bg-surface border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green text-text-primary" 
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className="w-full bg-bg-surface border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green text-text-primary" 
                  placeholder="john@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Role</label>
                  <select 
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                    className="w-full bg-bg-surface border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green text-text-primary"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Status</label>
                  <select 
                    value={newUser.status}
                    onChange={e => setNewUser({...newUser, status: e.target.value})}
                    className="w-full bg-bg-surface border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green text-text-primary"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-default mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-bold text-black bg-brand-green hover:bg-brand-green/90 rounded-lg transition-colors shadow-sm"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border-default flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-text-primary">Create New Role</h3>
              <button onClick={() => setShowAddRoleModal(false)} className="text-text-muted hover:text-text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddRole} className="p-6 space-y-4 bg-bg-surface">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">Role Name</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  className="w-full bg-bg-surface border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green text-text-primary" 
                  placeholder="e.g. Manager"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-default mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-bold text-black bg-brand-green hover:bg-brand-green/90 rounded-lg transition-colors shadow-sm"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

