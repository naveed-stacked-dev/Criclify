import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';

export default function Footer() {
  return (
    <footer className="bg-black py-12 border-t border-white/5 relative z-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
        <div className="mb-6 md:mb-0">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Logo" className="w-16 h-16" />
          <div className="text-2xl font-bold tracking-tighter">
            <span className="text-white">Cric</span>
            <span className="text-[#00f3ff]">Arena</span>
          </div>
          </Link>
          <p className="text-gray-500 text-sm">Elevate your cricket management.</p>
        </div>
        <div className="flex space-x-8 text-gray-500 text-sm">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <Link to="/leagues" className="hover:text-white transition-colors">Leagues</Link>
          <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
        </div>
        <div className="mt-6 md:mt-0 text-gray-500 text-sm flex space-x-6">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Twitter</a>
        </div>
      </div>
      <div className="text-center text-gray-600 text-xs mt-8">
        © {new Date().getFullYear()} CricArena. All rights reserved.
      </div>
    </footer>
  );
}
