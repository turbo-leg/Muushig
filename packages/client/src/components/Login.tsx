import { useState } from 'react';
import { useAuth, type OAuthProvider } from '../auth/AuthContext';
import { t } from '../i18n';

export function Login() {
  const { signIn, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        if (!username.trim()) {
          throw new Error('Username is required');
        }
        await signUpWithEmail(email, password, username);
        // Automatically sign in or alert user to check confirmation email
        alert('Registration successful! Please check your email for confirmation.');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    setError(null);
    try {
      await signIn(provider);
    } catch (err: any) {
      setError(err.message || 'OAuth authentication failed');
    }
  };

  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-[#29070a] p-4 lg:p-8 select-none overflow-y-auto">
      {/* ──────────────────────────── DESKTOP CONTAINER ──────────────────────────── */}
      <div className="hidden lg:grid grid-cols-12 max-w-5xl w-full rounded-[32px] border-2 border-[#e5c158]/50 bg-[#3d0d12] shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Left Side: Yurt Illustration & Branding */}
        <div className="col-span-6 relative flex flex-col justify-center items-center p-8 bg-cover bg-center overflow-hidden min-h-[550px]">
          {/* Yurt Background Image */}
          <img
            src="/assets/home_illustration.png"
            alt="Mongolian Yurt Card Scene"
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#29070a] via-transparent to-[#29070a]/40" />

          {/* Gold Logo & Branding Overlay */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <img
              src="/assets/logo.png"
              alt="Muushig Logo"
              className="w-28 h-28 object-contain drop-shadow-[0_4px_15px_rgba(0,0,0,0.5)]"
            />
            <h1
              className="mt-4 font-display text-4xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-b from-[#fce28a] via-[#d4af37] to-[#8b6914] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}
            >
              MUUSHIG
            </h1>
            <p className="mt-1 font-hand text-lg font-bold text-amber tracking-wider drop-shadow-md">
              МУУШИГ
            </p>
          </div>
        </div>

        {/* Right Side: Authentication Card */}
        <div className="col-span-6 flex items-center justify-center p-12 bg-[#2d090d] border-l border-[#e5c158]/20 relative">
          {/* Cloud decorations */}
          <div className="absolute -top-6 -right-6 w-20 h-20 opacity-15 pointer-events-none select-none text-amber">
            <svg viewBox="0 0 160 100" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M40 70 C 40 50, 60 40, 80 40 C 100 40, 120 50, 120 70" />
            </svg>
          </div>
          <div className="absolute -bottom-6 -left-6 w-20 h-20 opacity-15 pointer-events-none select-none text-amber">
            <svg viewBox="0 0 160 100" fill="none" stroke="currentColor" strokeWidth="2.5" className="scale-x-[-1]">
              <path d="M40 70 C 40 50, 60 40, 80 40 C 100 40, 120 50, 120 70" />
            </svg>
          </div>

          {/* Parchment Panel */}
          <div className="w-full max-w-sm rounded-[24px] border-2 border-[#e5c158] bg-[#faf8f4] px-7 py-8 shadow-[0_10px_35px_rgba(0,0,0,0.55)] text-[#332b25]">
            <h2 className="text-center font-display text-2xl font-black text-[#4c1116] uppercase tracking-wide border-b border-gild/20 pb-3 mb-6 select-none">
              {mode === 'login' ? 'Log In to Your Account' : 'Create Your Account'}
            </h2>

            {error && (
              <div className="mb-4 text-xs font-bold text-[#b91c1c] bg-[#fef2f2] border border-[#fca5a5] p-2.5 rounded-lg text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === 'register' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-extrabold uppercase text-[#736357]" htmlFor="reg-username">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      id="reg-username"
                      type="text"
                      required
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-xl border border-[#c5bbae]/60 bg-[#fefbf7] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-extrabold uppercase text-[#736357]" htmlFor="auth-email">
                  Username / Email
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-[#736357] text-sm">👤</span>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    placeholder="Username / Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-[#c5bbae]/60 bg-[#fefbf7] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-extrabold uppercase text-[#736357]" htmlFor="auth-password">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-[#736357] text-xs">🔒</span>
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-[#c5bbae]/60 bg-[#fefbf7] pl-10 pr-10 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-lg text-[#736357] hover:text-[#4c1116] cursor-pointer"
                  >
                    {showPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-[#736357] select-none mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="accent-[#d4af37] w-4 h-4 cursor-pointer"
                  />
                  <span>Remember Me</span>
                </label>
                <a href="#forgot" className="hover:underline hover:text-[#4c1116]">
                  Forgot Password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-amber to-amber-deep py-3 text-[#1d1503] font-hand font-extrabold text-base shadow-md hover:brightness-110 active:scale-98 transition-all cursor-pointer"
              >
                {loading ? 'PROCESSING...' : mode === 'login' ? 'LOG IN' : 'SIGN UP'}
              </button>
            </form>

            {/* Social Logins Divider */}
            <div className="relative flex py-4 items-center select-none text-xs text-[#c5bbae]">
              <div className="flex-grow border-t border-gild/15"></div>
              <span className="flex-shrink mx-3 text-[#736357] font-semibold">Or log in with...</span>
              <div className="flex-grow border-t border-gild/15"></div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleOAuth('google')}
                className="flex items-center justify-center w-11 h-11 rounded-full border border-[#c5bbae]/60 bg-[#fefbf7] hover:bg-parchment-deep text-lg cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                💡
              </button>
              <button
                onClick={() => handleOAuth('facebook')}
                className="flex items-center justify-center w-11 h-11 rounded-full border border-[#c5bbae]/60 bg-[#fefbf7] hover:bg-parchment-deep text-lg cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                👤
              </button>
              <button
                onClick={() => handleOAuth('discord')} // Replaces Apple as standard Discord integration
                className="flex items-center justify-center w-11 h-11 rounded-full border border-[#c5bbae]/60 bg-[#fefbf7] hover:bg-parchment-deep text-lg cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                👾
              </button>
            </div>

            <div className="mt-5 text-center text-xs font-semibold text-[#736357]">
              {mode === 'login' ? (
                <>
                  Not a member?{' '}
                  <button
                    onClick={() => {
                      setMode('register');
                      setError(null);
                    }}
                    className="text-[#4c1116] underline hover:text-[#d4af37] font-bold cursor-pointer"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className="text-[#4c1116] underline hover:text-[#d4af37] font-bold cursor-pointer"
                  >
                    Log In
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────── MOBILE CONTAINER ──────────────────────────── */}
      <div className="lg:hidden flex flex-col items-center w-full max-w-sm">
        {/* Top Branding Section */}
        <div className="flex flex-col items-center text-center select-none mb-4">
          <img src="/assets/logo.png" alt="Muushig Logo" className="w-20 h-20 object-contain" />
          <h1
            className="mt-2 font-display text-3xl font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-b from-[#fce28a] via-[#d4af37] to-[#8b6914] drop-shadow-md"
            style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}
          >
            MUUSHIG
          </h1>
          <p className="font-hand text-sm font-bold text-amber tracking-wider">МУУШИГ</p>
        </div>

        {/* Character Illustration Card */}
        <div className="relative w-full aspect-[2.1/1] overflow-hidden rounded-2xl border-2 border-[#e5c158] bg-[#3d0d12] shadow-md flex items-center justify-between px-6 mb-4 select-none">
          <div className="text-left max-w-[60%]">
            <h2 className="font-display text-lg font-bold text-[#faf8f4]">Welcome back, player!</h2>
            <p className="font-hand text-xs text-amber mt-1">Ready for a hand of Muushig?</p>
          </div>
          <img
            src="/assets/mongolian_boy.png"
            alt="Mongolian character holding cards"
            className="h-full object-contain self-end mt-2"
          />
        </div>

        {/* Auth Input Card */}
        <div className="w-full rounded-2xl border border-[#e5c158]/40 bg-[#350b0f] p-5 shadow-lg text-[#faf8f4]">
          {error && (
            <div className="mb-3.5 text-xs font-bold text-[#ff9999] bg-[#4a1217] border border-[#ff9999]/30 p-2.5 rounded-xl text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {mode === 'register' && (
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  required
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-gild/20 bg-[#2d090c] px-4 py-2.5 text-sm text-[#faf8f4] placeholder-[#736357] outline-none focus:border-[#d4af37]"
                />
              </div>
            )}

            <div className="relative">
              <input
                type="email"
                required
                placeholder="Username or Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gild/20 bg-[#2d090c] px-4 py-2.5 text-sm text-[#faf8f4] placeholder-[#736357] outline-none focus:border-[#d4af37]"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gild/20 bg-[#2d090c] pl-4 pr-10 py-2.5 text-sm text-[#faf8f4] placeholder-[#736357] outline-none focus:border-[#d4af37]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-2.5 text-lg text-[#736357]"
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>

            <div className="flex justify-end text-xs font-bold text-amber select-none">
              <a href="#forgot" className="hover:underline">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-xl bg-gradient-to-r from-amber to-amber-deep py-2.5 text-[#1d1503] font-hand font-extrabold text-base shadow-sm hover:brightness-110 active:scale-98 transition-all cursor-pointer"
            >
              {loading ? 'PROCESSING...' : mode === 'login' ? 'LOG IN' : 'SIGN UP'}
            </button>
          </form>

          {/* Social Logins Divider */}
          <div className="relative flex py-3 items-center select-none text-xs text-gild/30">
            <div className="flex-grow border-t border-gild/15"></div>
            <span className="flex-shrink mx-3 font-semibold text-[#736357]">Or log in with...</span>
            <div className="flex-grow border-t border-gild/15"></div>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => handleOAuth('google')}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-gild/20 bg-[#2d090c] text-[#faf8f4] text-base cursor-pointer shadow-sm"
            >
              💡
            </button>
            <button
              onClick={() => handleOAuth('facebook')}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-gild/20 bg-[#2d090c] text-[#faf8f4] text-base cursor-pointer shadow-sm"
            >
              👤
            </button>
            <button
              onClick={() => handleOAuth('discord')}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-gild/20 bg-[#2d090c] text-[#faf8f4] text-base cursor-pointer shadow-sm"
            >
              👾
            </button>
          </div>

          <div className="mt-4 text-center text-xs font-semibold text-[#736357]">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="text-amber underline font-bold cursor-pointer"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-amber underline font-bold cursor-pointer"
                >
                  Log In
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
