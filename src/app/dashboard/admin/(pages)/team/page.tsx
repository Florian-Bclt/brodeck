"use client"

import Loader from '@/app/components/Loader'
import { User } from '@/types'
import { FaUserPlus, FaEdit,FaTrashAlt } from "react-icons/fa";
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import TeamUserForm from '../../components/TeamUserForm';
import DeleteModal from '../../components/DeleteModal';
import { useSession } from 'next-auth/react';

export default function Team() {
  const { data: session } = useSession();
  const currentRole = session?.user?.role;
  const canAssignSuperAdmin = currentRole === "SUPERADMIN";

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit'| 'delete' | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    setLoading(true)
    fetch('/api/users')
    .then((res) => res.json())
    .then((data) => {
      setUsers(data);
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, [])

  // Logique de modal dynamique (add ou edit)
  const handleAddOrEditUser = async (payload: Partial<User>) => {
    setLoading(true)
    try {
      if (modalType === 'add') {
        const res = await fetch('/api/users', {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || "Echec de création");
      } else if (modalType === 'edit' && selectedUser) {
        const res = await fetch(`/api/users/${selectedUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type" : "application/json" },
          body: JSON.stringify(payload)
        })
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || "Echec de modification");
      }
      // Refresh list
      const res = await fetch('/api/users')
      setUsers(await res.json())
      setModalType(null)
      setSelectedUser(null)
      setLoading(false)
      toast.success('Utilisateur ajouté/modifié avec succès')
    } catch (error: any) {
      setLoading(false)
      toast.error(error.message || "Erreur lors de la création/Modification");
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, { method: "DELETE" })
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Erreur lors de le suppression')

      setUsers(users => users.filter(user => user.id !== selectedUser.id));
      toast.success('Utilisateur supprimé')
      
      setModalType(null)
      setSelectedUser(null)
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
    setLoading(false)
  }

  return (
    <div className="p-2 md:p-8">
      <div className='flex justify-between items-center text-lg mb-6'>
        <h1 className="text-xl md:text-2xl font-bold">Gestion du personnel</h1>
        <button 
          className='flex justify-between items-center border rounded-md md:px-4 py-2 bg-gray-700 text-slate-200 text-sm md:text-lg'
          onClick={() => { setModalType("add"); setSelectedUser(null); }}  
        >
          <span className='hidden md:flex'>Ajouter un membre </span>
          <FaUserPlus className='hidden md:flex ml-2'/>
          <FaUserPlus className='flex md:hidden text-xl mx-2 my-0.5'/>
        </button>
      </div>
      {loading ? (
        <Loader />
      ) : (
        <table className="min-w-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow text-left">
          <thead>
            <tr>
              <th className="px-6 py-3">Nom, Prénom</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Téléphone</th>
              <th className="px-6 py-3">Rôle</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t dark:border-gray-700">
                <td className="px-6 py-4">{user.lastname} {user.firstname} </td>
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4">{user.phoneNumber}</td>
                <td className="px-6 py-4">
                  <span
                    className={
                      user.role === "SUPERADMIN"
                      ? "text-green-600 font-semibold"
                        : user.role === "ADMIN"
                        ? "text-blue-500 font-semibold"
                          : "text-gray-500"
                    }
                  >
                    {user.role}
                  </span>
                </td>
                <td className='px-6 py-4 flex text-xl items-center'>
                  {user.role === "SUPERADMIN" && currentRole !== 'SUPERADMIN' ? (
                    <span className='text-amber-600 font-semibold text-xs'>Non modifiable</span>
                  ) : (
                    <>
                      <FaEdit className='text-blue-500 mr-4 cursor-pointer' onClick={() => { setModalType("edit"); setSelectedUser(user); }}/>
                      <FaTrashAlt className='text-red-600 cursor-pointer' onClick={() => { setModalType("delete"); setSelectedUser(user); }} />
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal Add/Edit */}
      <Modal
        isOpen={modalType === "add" || modalType === "edit"}
        onClose={() => { setModalType(null); setSelectedUser(null); }}
        title={modalType === "add" ? "Ajouter un membre" : "Modifier le membre"}
      >
        <TeamUserForm
          initialData={modalType === "edit" ? selectedUser || undefined : undefined}
          onCancel={() => { setModalType(null); setSelectedUser(null); }}
          onSubmit={handleAddOrEditUser}
          canAssignSuperAdmin={canAssignSuperAdmin}
          disableRoleForThisUser={selectedUser?.role === "SUPERADMIN" && !canAssignSuperAdmin}
        />
      </Modal>

      {/* Modal Delete */}
      <DeleteModal
        isOpen={modalType === "delete"}
        onClose={() => { setModalType(null); setSelectedUser(null); }}
        onConfirm={handleDeleteUser}
        title="Supprimer cet utilisateur ?"
        description={`Êtes-vous sûr de vouloir supprimer ${selectedUser?.firstname} ${selectedUser?.lastname} ? Cette action est irréversible.`}
      />
    </div>
  )
}
