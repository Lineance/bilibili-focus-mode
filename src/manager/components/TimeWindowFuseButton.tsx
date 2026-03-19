import { useState } from 'react';

export function TimeWindowFuseButton({ onFuseApplied }: { onFuseApplied: () => void }) {
  const [fuseCode, setFuseCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleApplyFuse = async () => {
    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'apply-time-window-fuse'
      });
      if (response.success) {
        setFuseCode(response.fuseCode);
        setExpiresAt(response.expiresAt);
        setMessage('熔断码已生成，请在5分钟内输入');
      } else {
        setMessage(response.message || '生成失败');
      }
    } catch {
      setMessage('生成熔断码时出错');
    }
    setIsLoading(false);
  };

  const handleVerifyFuse = async () => {
    if (!inputCode.trim()) return;
    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'verify-time-window-fuse',
        fuseCode: inputCode.trim().toUpperCase()
      });
      if (response.success) {
        setMessage('验证成功！现在可以处理待审池');
        onFuseApplied();
        setFuseCode(null);
        setExpiresAt(null);
        setInputCode('');
      } else {
        setMessage(response.message || '验证失败');
      }
    } catch {
      setMessage('验证熔断码时出错');
    }
    setIsLoading(false);
  };

  const timeLeft = expiresAt ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)) : 0;

  return (
    <div className="flex flex-col gap-2">
      {!fuseCode ? (
        <button
          onClick={handleApplyFuse}
          disabled={isLoading}
          className="px-3 py-1 bg-orange-600 rounded text-sm hover:bg-orange-700 disabled:opacity-50"
        >
          {isLoading ? '生成中...' : '申请熔断'}
        </button>
      ) : (
        <div className="flex flex-col gap-2 bg-gray-800 p-3 rounded">
          <div className="text-sm text-orange-400 font-mono">
            熔断码: {fuseCode}
          </div>
          <div className="text-xs text-gray-400">
            剩余时间: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="输入熔断码"
              className="flex-1 px-2 py-1 bg-gray-700 rounded text-sm"
            />
            <button
              onClick={handleVerifyFuse}
              disabled={isLoading || !inputCode.trim()}
              className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? '验证中...' : '验证'}
            </button>
          </div>
        </div>
      )}
      {message && (
        <div className={`text-xs ${message.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>
          {message}
        </div>
      )}
    </div>
  );
}