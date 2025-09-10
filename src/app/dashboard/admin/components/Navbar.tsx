import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation';
import { signOut } from "next-auth/react";
import React from 'react'
import { UserData } from '@/types/users';

type NavbarProps = {
  user?: UserData | null;
}

export default function Navbar({user}: NavbarProps) {
  const router = useRouter();

  const displayName =
    (user?.pseudo && user.pseudo.trim()) ||
    user?.firstName || "Membre";
  
  const logout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <>
      {/* Navbar Desktop */}
      <div className='hidden md:flex justify-between items-center border-b-[0.5px] border-b-gray-400 '>
        <h1 className="flex flex-col items-center lg:items-start text-center lg:text-left text-2xl lg:text-3xl font-bold">Bienvenue, {displayName} 👋</h1>          
          {/* Bouton logout */}
          <button 
            onClick={logout}
            className='mr-6 mb-1 bg-white text-gray-800 rounded-md w-10 h-10 flex justify-center items-center transition-all hover:bg-gray-300 hover:scale-105'
          >
            <LogOut />
          </button>
      </div>

      {/* Navbar mobile */}
      <div className='flex md:hidden justify-end border-b-[0.5px] border-b-gray-400 pt-6 pb-2'>
        <div className='flex justify-end items-center mr-1'>         
          {/* Bouton logout */}
          <button 
            onClick={logout}
            className='mr-6 mb-1 bg-white text-gray-800 rounded-md w-8 h-8 flex justify-center items-center transition-all hover:bg-gray-300 hover:scale-105'
          >
            <LogOut />
          </button>
        </div>
      </div>
    </>
  )
}
