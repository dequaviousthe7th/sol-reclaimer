'use client';

import { FC, useEffect, useCallback, useState } from 'react';

interface SubmitTokenModalProps {
  open: boolean;
  onClose: () => void;
}

function isValidBase58(str: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(str);
}

export const SubmitTokenModal: FC<SubmitTokenModalProps> = ({ open, onClose }) => {
  const [mintAddress, setMintAddress] = useState('');
  const [projectName, setProjectName] = useState('');
  const [twitter, setTwitter] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [relationship, setRelationship] = useState<'creator' | 'finder'>('creator');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  const handleSubmit = async () => {
    setError('');

    if (!mintAddress || !isValidBase58(mintAddress)) {
      setError('Please enter a valid Solana mint address.');
      return;
    }

    if (!projectName || projectName.length < 3 || projectName.length > 50) {
      setError('Project name must be 3-50 characters.');
      return;
    }

    // Check localStorage rate limit
    const lastSubmit = localStorage.getItem('hackathon-submit');
    if (lastSubmit) {
      setError('You have already submitted a token this session.');
      return;
    }

    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
    if (!workerUrl) {
      setError('Service unavailable.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${workerUrl}/api/hackathon/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mintAddress,
          projectName,
          relationship,
          twitter: twitter || undefined,
          website: website || undefined,
          description: description || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Submission failed' }));
        setError((data as { error?: string }).error || 'Submission failed');
        return;
      }

      localStorage.setItem('hackathon-submit', '1');
      setSuccess(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 backdrop-blur-sm modal-enter"
      onClick={onClose}
    >
      <div
        className="card p-6 sm:p-8 max-w-lg w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto scroll-fade modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Submit Token</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-semibold mb-1">Token Submitted!</p>
            <p className="text-sm text-gray-400">Your submission will be reviewed and may be added to the screener.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-400 mb-4">
              Submit a PumpFun hackathon token for review. Approved tokens will appear in the screener.
            </p>

            {/* Relationship */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Your Relationship *</label>
              <div className="flex rounded-xl border border-[#222228] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setRelationship('creator')}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    relationship === 'creator'
                      ? 'bg-solana-green/15 text-solana-green border-r border-[#222228]'
                      : 'bg-[#0a0a0b] text-gray-500 hover:text-gray-300 border-r border-[#222228]'
                  }`}
                >
                  I created this token
                </button>
                <button
                  type="button"
                  onClick={() => setRelationship('finder')}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    relationship === 'finder'
                      ? 'bg-solana-purple/15 text-solana-purple'
                      : 'bg-[#0a0a0b] text-gray-500 hover:text-gray-300'
                  }`}
                >
                  I found this token
                </button>
              </div>
            </div>

            {/* Mint address */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Token Mint Address *</label>
              <input
                type="text"
                value={mintAddress}
                onChange={(e) => setMintAddress(e.target.value.trim())}
                placeholder="e.g. 6CRayr4GnspC1GUDLs693oPk7AoD..."
                className="w-full bg-[#0a0a0b] border border-[#222228] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-solana-purple/50 focus:outline-none transition-colors"
              />
            </div>

            {/* Project name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Project Name *</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. CashApp"
                maxLength={50}
                className="w-full bg-[#0a0a0b] border border-[#222228] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-solana-purple/50 focus:outline-none transition-colors"
              />
            </div>

            {/* Twitter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Twitter Handle</label>
              <input
                type="text"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="@handle"
                className="w-full bg-[#0a0a0b] border border-[#222228] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-solana-purple/50 focus:outline-none transition-colors"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#0a0a0b] border border-[#222228] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-solana-purple/50 focus:outline-none transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the project..."
                maxLength={200}
                rows={3}
                className="w-full bg-[#0a0a0b] border border-[#222228] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-solana-purple/50 focus:outline-none transition-colors resize-none"
              />
              <p className="text-xs text-gray-600 mt-1">{description.length}/200</p>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-solana-purple to-solana-green text-white font-semibold py-3 rounded-xl transition-all duration-200 hover:opacity-90 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {submitting ? 'Submitting...' : 'Submit Token'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
