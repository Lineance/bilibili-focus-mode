import { useState, useCallback } from 'react';

interface UseFuseCodeReturn {
  fuseCode: string;
  isVerified: boolean;
  verify: (input: string) => boolean;
  regenerate: () => void;
}

export function useFuseCode(initialLength: number = 8): UseFuseCodeReturn {
  const [fuseCode, setFuseCode] = useState(() => generateFuseCode(initialLength));
  const [isVerified, setIsVerified] = useState(false);

  const verify = useCallback((input: string): boolean => {
    const normalizedInput = input.replace(/-/g, '').toUpperCase();
    const normalizedCode = fuseCode.replace(/-/g, '').toUpperCase();
    const valid = normalizedInput === normalizedCode;
    setIsVerified(valid);
    return valid;
  }, [fuseCode]);

  const regenerate = useCallback(() => {
    setFuseCode(generateFuseCode(initialLength));
    setIsVerified(false);
  }, [initialLength]);

  return { fuseCode, isVerified, verify, regenerate };
}

function generateFuseCode(length: number): string {
  const bytes = new Uint8Array(length / 2);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return hex.match(/.{1,4}/g)?.join('-') || hex;
}
