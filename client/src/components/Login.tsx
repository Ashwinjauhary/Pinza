import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useChat } from '../hooks/useChat';

export const Login: React.FC = () => {
    const { sendOtp, verifyOtp } = useChat();
    const [step, setStep] = useState<1 | 2>(1);
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await sendOtp(phone);
            setStep(2);
        } catch (err) {
            setError('Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await verifyOtp(phone, otp, username);
        } catch (err: any) {
            setError(err.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-10"
            >
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent mb-2">Pingza</h1>
                    <p className="text-gray-400">Secure. Fast. Private.</p>
                    <p className="text-[10px] text-gray-500 mt-2">(Dev Mode: OTP will appear in server terminal)</p>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleSendOtp} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white placeholder-gray-500"
                                placeholder="+1 234 567 8900"
                                required
                            />
                        </div>
                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-primary to-emerald-600 rounded-xl font-bold text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Sending...' : 'Continue'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerify} className="space-y-6">
                        <div className="text-center mb-4">
                            <p className="text-sm text-gray-400">OTP sent to {phone}</p>
                            <button type="button" onClick={() => setStep(1)} className="text-xs text-primary hover:underline">Change Number</button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">One-Time Password (OTP)</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white placeholder-gray-500 tracking-widest text-center font-mono text-lg"
                                placeholder="• • • • • •"
                                required
                                maxLength={6}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white placeholder-gray-500"
                                placeholder="What should we call you?"
                                required
                            />
                        </div>

                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-primary to-emerald-600 rounded-xl font-bold text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Verifying...' : 'Login'}
                        </button>
                    </form>
                )}
            </motion.div>
        </div>
    );
};
