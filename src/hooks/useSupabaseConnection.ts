import { useState, useEffect } from 'react';
import { checkSupabaseConnection } from '../config/supabase';

export const useSupabaseConnection = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkConnection = async () => {
      try {
        setIsChecking(true);
        const connected = await checkSupabaseConnection();
        
        if (!mounted) return;
        
        setIsConnected(connected);
        if (!connected) {
          setError('Unable to connect to the database');
        } else {
          setError(null);
        }
      } catch (err) {
        if (!mounted) return;
        setError('Connection check failed');
        setIsConnected(false);
      } finally {
        if (mounted) {
          setIsChecking(false);
        }
      }
    };

    // Initial check
    checkConnection();

    // Set up periodic checks
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds

    // Monitor online/offline status
    const handleOnline = () => {
      console.debug('Browser went online');
      checkConnection();
    };

    const handleOffline = () => {
      console.debug('Browser went offline');
      if (mounted) {
        setIsConnected(false);
        setError('Internet connection lost');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isConnected,
    isChecking,
    error,
    checkConnection: async () => {
      setIsChecking(true);
      const connected = await checkSupabaseConnection();
      setIsConnected(connected);
      setIsChecking(false);
      if (!connected) {
        setError('Unable to connect to the database');
      } else {
        setError(null);
      }
      return connected;
    },
  };
};
