import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-center">
      <div className="max-w-md space-y-4">
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 inline-block">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">404 - Sector Not Found</h1>
        <p className="text-xs text-slate-400">
          The requested coordinate or command center dispatch sector does not exist.
        </p>
        <Link to="/dashboard">
          <Button size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Return to Command Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
