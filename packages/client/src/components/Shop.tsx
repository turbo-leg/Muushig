import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { identityFromSession } from '../auth/identity';
import { PlayingCard } from './PlayingCard';
import { t } from '../i18n';
import { GoldCoinIcon } from './Icons';

interface ShopCatalogItem {
  id: string;
  name: string;
  cost: number;
  type: 'deck' | 'emote' | 'avatar' | 'chat';
  description: string;
  class?: string;
  icon?: string;
}

const CATALOG_ITEMS: ShopCatalogItem[] = [
  // Decks
  { id: 'emerald', name: 'Emerald Felt', cost: 0, type: 'deck', description: 'Standard emerald felt card back', class: 'back-emerald' },
  { id: 'crimson', name: 'Ruby Velvet', cost: 30, type: 'deck', description: 'Rich ruby red velvet felt', class: 'back-crimson' },
  { id: 'sapphire', name: 'Midnight Sapphire', cost: 50, type: 'deck', description: 'Deep midnight blue sapphire felt', class: 'back-sapphire' },
  { id: 'gold', name: 'Imperial Gold', cost: 100, type: 'deck', description: 'Royal golden sun felt', class: 'back-gold' },
  { id: 'jade_bisiir', name: 'Jade Bisiir Card Back', cost: 1000, type: 'deck', description: 'Sacred green jade turtle styling', class: 'back-emerald' },
  { id: 'shamanic_spirit', name: 'Shamanic Spirit Deck', cost: 1200, type: 'deck', description: 'Mystic elements card felt', class: 'back-sapphire' },
  { id: 'nomad_king', name: 'Nomad King Deck', cost: 3500, type: 'deck', description: 'Legendary khan gold felt', class: 'back-gold' },
  // Cosmetics
  { id: 'shamanic_dance', name: 'Shamanic Dance Emote', cost: 750, type: 'emote', description: 'Traditional spirit calling animation', icon: '🔮' },
  { id: 'morin_khuur_avatar', name: 'Morin Khuur Avatar Prep', cost: 500, type: 'avatar', description: 'Fiddle playing character portrait', icon: '🎻' },
  { id: 'nomadic_warrior', name: 'Nomadic Warrior Avatar', cost: 1500, type: 'avatar', description: 'Armored steppe horseman card', icon: '🐎' },
  { id: 'silver_wolf', name: 'Silver Wolf Chat Bubbles', cost: 250, type: 'chat', description: 'Sleek timberwolf dialogue skins', icon: '🐺' },
];

interface CoinPack {
  id: string;
  coins: number;
  price: string;
  desktopPrice: string;
  popular?: boolean;
}

const COIN_PACKS: CoinPack[] = [
  { id: 'pack_small', coins: 500, price: '$4.99', desktopPrice: '$9.99' },
  { id: 'pack_medium', coins: 2500, price: '$19.99', desktopPrice: '$24.99', popular: true },
  { id: 'pack_large', coins: 5000, coinsDisplay: '2500 Coins', price: '$49.99', desktopPrice: '$49.99' } as any, // Mapped to match mockup exactly
];

export function Shop({ session }: { session: Session }) {
  const me = identityFromSession(session);
  const [coins, setCoins] = useState<number | null>(null);
  const [activeBack, setActiveBack] = useState<string>('emerald');
  const [unlockedBacks, setUnlockedBacks] = useState<string>('emerald');
  const [unlockedCosmetics, setUnlockedCosmetics] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'featured' | 'decks' | 'cosmetics' | 'currency'>('featured');
  const [loading, setLoading] = useState(true);

  // Sync state with database
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('coins, active_back, unlocked_backs, unlocked_cosmetics')
          .eq('id', me.userId)
          .maybeSingle();
        if (!active) return;
        if (data) {
          const pData = data as {
            coins?: number;
            active_back?: string;
            unlocked_backs?: string;
            unlocked_cosmetics?: string;
          };
          setCoins(pData.coins ?? 0);
          setActiveBack(pData.active_back ?? 'emerald');
          setUnlockedBacks(pData.unlocked_backs ?? 'emerald');
          setUnlockedCosmetics(pData.unlocked_cosmetics ?? '');
        }
      } catch {
        // Fallback silently
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [me.userId]);

  const handleEquip = async (itemId: string) => {
    setActiveBack(itemId);
    localStorage.setItem('muushig_card_back', itemId);
    if (supabase) {
      await supabase.from('profiles').update({ active_back: itemId }).eq('id', me.userId);
    }
  };

  const handleBuyDeck = async (item: ShopCatalogItem) => {
    if (coins === null || coins < item.cost) {
      alert('Not enough gold coins!');
      return;
    }
    const newCoins = coins - item.cost;
    const nextUnlocked = `${unlockedBacks},${item.id}`;

    setCoins(newCoins);
    setUnlockedBacks(nextUnlocked);
    setActiveBack(item.id);
    localStorage.setItem('muushig_card_back', item.id);

    if (supabase) {
      await supabase
        .from('profiles')
        .update({ coins: newCoins, active_back: item.id, unlocked_backs: nextUnlocked })
        .eq('id', me.userId);
    }
  };

  const handleBuyCosmetic = async (item: ShopCatalogItem) => {
    if (coins === null || coins < item.cost) {
      alert('Not enough gold coins!');
      return;
    }
    const newCoins = coins - item.cost;
    const nextUnlocked = unlockedCosmetics ? `${unlockedCosmetics},${item.id}` : item.id;

    setCoins(newCoins);
    setUnlockedCosmetics(nextUnlocked);

    if (supabase) {
      await supabase
        .from('profiles')
        .update({ coins: newCoins, unlocked_cosmetics: nextUnlocked })
        .eq('id', me.userId);
    }
    alert(`Successfully purchased ${item.name}!`);
  };

  const handleBuyCoins = async (amount: number) => {
    if (coins === null) return;
    const newCoins = coins + amount;
    setCoins(newCoins);
    if (supabase) {
      await supabase.from('profiles').update({ coins: newCoins }).eq('id', me.userId);
    }
    alert(`Successfully purchased ${amount} Gold Coins!`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <p className="font-hand text-xl text-[#c5bbae] animate-pulse">{t('loadingEllipsis')}</p>
      </div>
    );
  }

  const isUnlocked = (item: ShopCatalogItem) => {
    if (item.type === 'deck') {
      return unlockedBacks.split(',').includes(item.id);
    }
    return unlockedCosmetics.split(',').includes(item.id);
  };

  // Render lists based on active tab
  const getRenderItems = () => {
    if (activeTab === 'decks') {
      return CATALOG_ITEMS.filter((i) => i.type === 'deck');
    }
    if (activeTab === 'cosmetics') {
      return CATALOG_ITEMS.filter((i) => i.type !== 'deck');
    }
    return [];
  };

  return (
    <div className="w-full text-[#332b25]">
      {/* ──────────────────────────── DESKTOP VIEW ──────────────────────────── */}
      <div className="hidden lg:grid grid-cols-12 gap-6 p-1">
        {/* Left 9-Cols: Catalog & Navigation */}
        <div className="col-span-9 flex flex-col gap-5">
          {/* Tabs Menu */}
          <div className="flex items-center gap-3 bg-[#4c1116]/20 p-2 rounded-2xl border border-gild/15 select-none">
            {(['featured', 'decks', 'cosmetics', 'currency'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-xl font-hand font-extrabold text-sm border transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-amber border-amber-deep text-[#1d1503] shadow-md'
                    : 'bg-transparent border-transparent text-cream hover:bg-[#4c1116]/40'
                }`}
              >
                [{tab.replace('_', ' ').toUpperCase()}]
              </button>
            ))}
          </div>

          {activeTab === 'featured' && (
            <div className="flex flex-col gap-6">
              {/* Premium Hero Banner */}
              <div className="relative overflow-hidden rounded-[24px] border-2 border-[#e5c158] bg-[#3d0d12] aspect-[2.7/1] flex items-center justify-between px-10 shadow-md">
                <img
                  src="/assets/home_illustration.png"
                  alt="Steppe background"
                  className="absolute inset-0 w-full h-full object-cover opacity-15"
                />
                <div className="relative z-10 text-left max-w-lg">
                  <span className="text-[10px] font-bold text-amber bg-[#5c1319] border border-amber/30 px-3 py-1 rounded-full tracking-widest uppercase">
                    PREMIUM
                  </span>
                  <h2 className="font-display text-2xl font-black text-[#faf8f4] tracking-wide uppercase mt-3">
                    THE IMPERIAL COURT
                  </h2>
                  <p className="font-hand text-sm text-amber mt-1">SUPREME COLLECTION</p>
                </div>
                <div className="relative z-10 flex gap-4 pr-4">
                  <div className="w-16 h-22 rounded-lg border border-amber/40 bg-parchment-deep shadow-lg transform rotate-[-8deg]" />
                  <div className="w-16 h-22 rounded-lg border border-amber bg-amber/20 shadow-xl transform translate-y-[-8px] scale-105" />
                  <div className="w-16 h-22 rounded-lg border border-amber/40 bg-parchment-deep shadow-lg transform rotate-[8deg]" />
                </div>
              </div>

              {/* Featured items catalog section */}
              <div className="flex flex-col">
                <h3 className="font-display text-lg font-bold text-ember border-b border-gild/15 pb-2 mb-4 select-none">
                  Featured Items
                </h3>
                <div className="grid grid-cols-3 gap-5">
                  {/* Jade Bisiir Deck */}
                  {CATALOG_ITEMS.filter((i) => ['jade_bisiir', 'shamanic_dance', 'nomadic_warrior'].includes(i.id)).map((item) => {
                    const unlocked = isUnlocked(item);
                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-gild/30 bg-parchment-deep/80 p-5 flex flex-col items-center justify-between text-center relative hover:scale-[1.02] hover:shadow-md transition-all select-none"
                      >
                        {item.type === 'deck' ? (
                          <div className="w-20 h-28 my-2 flex items-center justify-center filter drop-shadow-md">
                            <PlayingCard faceDown={true} className={`${item.class} pointer-events-none`} />
                          </div>
                        ) : (
                          <div className="text-5xl my-4">{item.icon}</div>
                        )}
                        <h4 className="font-display text-sm font-extrabold text-ember truncate w-full mt-2">
                          {item.name}
                        </h4>
                        {unlocked ? (
                          <button
                            onClick={() => item.type === 'deck' && handleEquip(item.id)}
                            className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber to-amber-deep text-[#1d1503] font-hand text-xs font-bold shadow-sm hover:brightness-110 active:scale-98 cursor-pointer"
                          >
                            {activeBack === item.id ? 'ACTIVE' : 'EQUIP'}
                          </button>
                        ) : (
                          <button
                            onClick={() => item.type === 'deck' ? handleBuyDeck(item) : handleBuyCosmetic(item)}
                            className="mt-4 w-full py-2.5 rounded-xl bg-[#4c1116] text-cream font-hand text-xs font-bold hover:bg-[#350e13] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <GoldCoinIcon className="w-3.5 h-3.5" />
                            <span>{item.cost}g</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Render category list */}
          {(activeTab === 'decks' || activeTab === 'cosmetics') && (
            <div className="grid grid-cols-3 gap-5">
              {getRenderItems().map((item) => {
                const unlocked = isUnlocked(item);
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gild/30 bg-parchment-deep/80 p-5 flex flex-col items-center justify-between text-center relative hover:scale-[1.02] hover:shadow-md transition-all select-none"
                  >
                    {item.type === 'deck' ? (
                      <div className="w-20 h-28 my-2 flex items-center justify-center filter drop-shadow-md">
                        <PlayingCard faceDown={true} className={`${item.class} pointer-events-none`} />
                      </div>
                    ) : (
                      <div className="text-5xl my-4">{item.icon}</div>
                    )}
                    <div>
                      <h4 className="font-display text-sm font-extrabold text-ember truncate w-full mt-2">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-[#736357] leading-snug mt-1 max-w-[150px] mx-auto">
                        {item.description}
                      </p>
                    </div>
                    {unlocked ? (
                      <button
                        onClick={() => item.type === 'deck' && handleEquip(item.id)}
                        className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber to-amber-deep text-[#1d1503] font-hand text-xs font-bold shadow-sm hover:brightness-110 active:scale-98 cursor-pointer"
                      >
                        {activeBack === item.id ? 'ACTIVE' : 'EQUIP'}
                      </button>
                    ) : (
                      <button
                        onClick={() => item.type === 'deck' ? handleBuyDeck(item) : handleBuyCosmetic(item)}
                        className="mt-4 w-full py-2.5 rounded-xl bg-[#4c1116] text-cream font-hand text-xs font-bold hover:bg-[#350e13] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <GoldCoinIcon className="w-3.5 h-3.5" />
                        <span>{item.cost}g</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Render Currency category */}
          {activeTab === 'currency' && (
            <div className="grid grid-cols-3 gap-5">
              {COIN_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className="rounded-2xl border-2 border-[#e5c158]/60 bg-parchment-deep/80 p-6 flex flex-col items-center text-center relative hover:scale-[1.02] transition-all select-none"
                >
                  {pack.popular && (
                    <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-[9px] font-bold text-[#faf8f4] bg-amber border border-amber-deep px-3 py-0.5 rounded-full uppercase">
                      Best Deal
                    </span>
                  )}
                  <div className="text-4xl my-4">🪙</div>
                  <h4 className="font-display text-base font-extrabold text-ember">{pack.coins} Coins</h4>
                  <p className="text-xs text-[#736357] mt-1 font-medium">Standard currency bundle</p>
                  <button
                    onClick={() => handleBuyCoins(pack.coins)}
                    className="mt-5 w-full py-2.5 rounded-xl bg-[#4c1116] hover:bg-[#350e13] text-cream font-hand text-xs font-bold transition-all cursor-pointer"
                  >
                    Buy for {pack.desktopPrice}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 3-Cols: Store Cart & Quick Currency */}
        <div className="col-span-3 flex flex-col gap-6">
          {/* Shopping Cart card */}
          <div className="bg-parchment-deep/80 border border-gild/30 rounded-[20px] p-5 shadow-sm select-none">
            <h3 className="font-display text-base font-extrabold text-ember border-b border-gild/15 pb-2 mb-4">
              Shopping Cart
            </h3>
            <div className="flex flex-col items-center justify-center py-6 text-[#736357] text-xs font-semibold">
              <span className="text-2xl mb-2">🛒</span>
              <p>Your cart is empty</p>
            </div>
          </div>

          {/* Quick Currency store card */}
          <div className="bg-parchment-deep/80 border border-gild/30 rounded-[20px] p-5 shadow-sm flex flex-col gap-4 select-none">
            <h3 className="font-display text-base font-extrabold text-ember border-b border-gild/15 pb-2">
              Currency Store
            </h3>

            {COIN_PACKS.map((pack) => (
              <div
                key={pack.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gild/10 bg-[#4c1116]/5 hover:bg-[#4c1116]/10 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🪙</span>
                  <div className="text-left leading-tight">
                    <span className="font-display text-xs font-extrabold text-[#332b25]">
                      {pack.coins} Coins
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleBuyCoins(pack.coins)}
                  className="rounded-lg bg-amber px-3 py-1 font-hand text-xs font-bold text-[#1d1503] hover:brightness-105 transition-all cursor-pointer"
                >
                  {pack.desktopPrice}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ──────────────────────────── MOBILE VIEW ──────────────────────────── */}
      <div className="lg:hidden flex flex-col gap-5 p-1 select-none">
        {/* Daily Deals Section */}
        <div>
          <h3 className="font-display text-base font-extrabold text-ember border-b border-gild/15 pb-1.5 mb-3">
            DAILY DEALS
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {CATALOG_ITEMS.filter((i) => ['shamanic_spirit', 'nomad_king', 'morin_khuur_avatar', 'silver_wolf'].includes(i.id)).map((item) => {
              const unlocked = isUnlocked(item);
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-gild/20 bg-parchment-deep/80 p-4 flex flex-col items-center justify-between text-center relative"
                >
                  {item.type === 'deck' ? (
                    <div className="w-16 h-22 my-1 flex items-center justify-center filter drop-shadow-md">
                      <PlayingCard faceDown={true} className={`${item.class} pointer-events-none`} />
                    </div>
                  ) : (
                    <div className="text-4xl my-2">{item.icon}</div>
                  )}
                  <div className="mt-1">
                    <h4 className="font-display text-xs font-extrabold text-ember truncate max-w-[120px] mx-auto">
                      {item.name}
                    </h4>
                  </div>
                  {unlocked ? (
                    <button
                      onClick={() => item.type === 'deck' && handleEquip(item.id)}
                      className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-amber to-amber-deep text-[#1d1503] font-hand text-xs font-bold shadow-sm cursor-pointer"
                    >
                      {activeBack === item.id ? 'ACTIVE' : 'EQUIP'}
                    </button>
                  ) : (
                    <button
                      onClick={() => item.type === 'deck' ? handleBuyDeck(item) : handleBuyCosmetic(item)}
                      className="mt-3 w-full py-2 rounded-xl bg-[#4c1116] text-cream font-hand text-xs font-bold hover:bg-[#350e13] transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <GoldCoinIcon className="w-3 h-3" />
                      <span>{item.cost}g</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Currency Packs Section */}
        <div>
          <h3 className="font-display text-base font-extrabold text-ember border-b border-gild/15 pb-1.5 mb-3">
            CURRENCY PACKS
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {COIN_PACKS.filter((p) => p.id !== 'pack_large').map((pack) => (
              <div
                key={pack.id}
                className="rounded-xl border border-gild/20 bg-parchment-deep/80 p-4 flex flex-col items-center text-center relative"
              >
                <div className="text-3xl my-2">🪙</div>
                <h4 className="font-display text-xs font-extrabold text-ember">{pack.coins} Coins</h4>
                <button
                  onClick={() => handleBuyCoins(pack.coins)}
                  className="mt-3.5 w-full py-2 rounded-xl bg-[#4c1116] text-cream font-hand text-xs font-bold hover:bg-[#350e13] transition-all cursor-pointer"
                >
                  Buy for {pack.price}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
