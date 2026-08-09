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

const INITIAL_USERS: UserType[] = [
  { id: 1, name: "Rahul Verma", email: "rahul@greenshop.ai", role: "Owner", status: "Active" },
  { id: 2, name: "Priya Sharma", email: "priya@greenshop.ai", role: "Worker", status: "Active" },
  { id: 3, name: "Amit Kumar", email: "amit@greenshop.ai", role: "Bill", status: "Inactive" },
  { id: 4, name: "Neha Gupta", email: "neha@greenshop.ai", role: "Worker", status: "Active" },
];

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

  // Load from localStorage on mount
  useEffect(() => {
    const savedRoles = localStorage.getItem("gs_roles");
    if (savedRoles) setRoles(JSON.parse(savedRoles));
    else setRoles(INITIAL_ROLES);

    const savedUsers = localStorage.getItem("gs_users");
    if (savedUsers) setUsers(JSON.parse(savedUsers));
    else setUsers(INITIAL_USERS);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (roles.length > 0) localStorage.setItem("gs_roles", JSON.stringify(roles));
  }, [roles]);

  useEffect(() => {
    if (users.length > 0) localStorage.setItem("gs_users", JSON.stringify(users));
  }, [users]);

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
            <div className="glass-panel p-6 bg-white border border-slate-200 rounded-xl">
              <h3 className="text-base font-bold text-slate-800 mb-6">General Information</h3>
              <form className="space-y-5" onSubmit={e => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Store Name</label>
                    <input type="text" defaultValue="GreenShop AI - Koramangala" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Store ID</label>
                    <input type="text" defaultValue="GS-KOR-01" disabled className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Contact Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="email" defaultValue="contact@greenshop.ai" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" defaultValue="+91 98765 43210" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <textarea rows={3} defaultValue="123, 4th Cross, 5th Block, Koramangala, Bengaluru, Karnataka 560095" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"></textarea>
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
              <button 
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add User
              </button>
            </div>

            <div className="glass-panel overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                      <th className="px-4 py-3 font-semibold">User</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          No users found.
                        </td>
                      </tr>
                    )}
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800">{user.name}</div>
                              <div className="text-xs text-slate-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs border border-slate-200">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                            <span className="text-slate-600 text-xs font-medium">{user.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2 text-slate-400">
                            <button className="p-1.5 hover:bg-slate-100 hover:text-blue-600 transition-colors rounded-lg">
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
            <div className="glass-panel p-4 md:col-span-1 h-fit bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800">Available Roles</h3>
                <button 
                  onClick={() => setShowAddRoleModal(true)}
                  className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
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
                        ? 'bg-green-50 text-green-700 border border-green-200 shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    {role.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Editor */}
            {activeRole && (
              <div className="glass-panel p-6 md:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Edit Role: {activeRole.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Manage permissions for this role.</p>
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
                    <div key={module} className="border border-slate-100 rounded-lg p-4 bg-slate-50/30">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-bold text-slate-800">{module}</h4>
                        <label className="flex items-center gap-2 cursor-pointer group text-xs text-slate-500 hover:text-green-600 transition-colors">
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
                            className="w-3.5 h-3.5 text-[#0FA958] bg-white border-slate-300 rounded focus:ring-[#0FA958] focus:ring-offset-0 cursor-pointer" 
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
                                className="w-4 h-4 text-[#0FA958] bg-white border-slate-300 rounded focus:ring-[#0FA958] focus:ring-offset-0 cursor-pointer" 
                              />
                            </div>
                            <span className="text-sm text-slate-600 group-hover:text-slate-900 capitalize select-none">
                              {perm}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-6 mt-6 border-t border-slate-100">
                  <button 
                    onClick={() => alert('Permissions saved successfully!')}
                    className="bg-[#0FA958] hover:bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Add New Team Member</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                  placeholder="john@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Role</label>
                  <select 
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Status</label>
                  <select 
                    value={newUser.status}
                    onChange={e => setNewUser({...newUser, status: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Create New Role</h3>
              <button onClick={() => setShowAddRoleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddRole} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Role Name</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" 
                  placeholder="e.g. Manager"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-bold text-white bg-[#0FA958] hover:bg-green-600 rounded-lg transition-colors shadow-sm"
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

