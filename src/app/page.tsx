"use client";

import Sidebar from '@/components/sidebar';
import { MessageSquareDashed } from 'lucide-react';

export default function Home() {
  return (
    <main className="h-screen w-screen flex overflow-hidden">
      <Sidebar className="w-full md:w-80 border-r-0 md:border-r" />
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-background p-4 text-center">
        <div className="w-full max-w-md space-y-4">
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
              <MessageSquareDashed className="w-12 h-12 text-muted-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Welcome to DuetCast</h1>
          <p className="text-muted-foreground">
            Select a chat from the sidebar to start messaging and sharing media in real-time.
          </p>
        </div>
      </div>
    </main>
  );
}
