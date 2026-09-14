import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, MobileSidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout: React.FC = () => (
  <div className="flex h-screen bg-bg-base overflow-hidden">
    <Sidebar />
    <MobileSidebar />
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6 2xl:p-8">
        <div className="max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  </div>
);
