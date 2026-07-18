import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { identityFromSession } from '../auth/identity';
import { PlayingCard } from './PlayingCard';
import { t } from '../i18n';
import { GoldCoinIcon } from './Icons';

interface ShopItem {
  id: string;
  name: string;
  mnName: string;
  cost: number;
  class: string;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: 'emerald', name: 'Emerald Felt', mnName: 'Маргад Ногоон', cost: 0, class: 'back-emerald' },
  { id: 'crimson', name: 'Ruby Velvet', mnName: 'Тансаг Улаан', cost: 30, class: 'back-crimson' },
  {
    id: 'sapphire',
    name: 'Midnight Sapphire',
    mnName: 'Гүн Хөх',
    cost: 50,
    class: 'back-sapphire',
  },
  { id: 'gold', name: 'Imperial Gold', mnName: 'Эзэн Хааны Алт', cost: 100, class: 'back-gold' },
];

export function Shop({ session }: { session: Session }) {
  const me = identityFromSession(session);
  const [coins, setCoins] = useState<number | null>(null);
  const [activeBack, setActiveBack] = useState<string>('emerald');
  const [unlockedBacks, setUnlockedBacks] = useState<string>('emerald');
  const [loading, setLoading] = useState(true);

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
          .select('coins, active_back, unlocked_backs')
          .eq('id', me.userId)
          .maybeSingle();
        if (!active) return;
        if (data) {
          const pData = data as { coins?: number; active_back?: string; unlocked_backs?: string };
          setCoins(pData.coins ?? 0);
          setActiveBack(pData.active_back ?? 'emerald');
          setUnlockedBacks(pData.unlocked_backs ?? 'emerald');
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

  const handleBuy = async (item: ShopItem) => {
    if (!supabase) return;
    const { data: success } = await supabase.rpc('buy_card_back', {
      item_name: item.id,
      cost: item.cost,
    });
    if (success) {
      setCoins((c) => (c !== null ? c - item.cost : null));
      setUnlockedBacks((prev) => `${prev},${item.id}`);
      setActiveBack(item.id);
      localStorage.setItem('muushig_card_back', item.id);
      await supabase.from('profiles').update({ active_back: item.id }).eq('id', me.userId);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <p className="font-hand text-xl text-[#c5bbae] animate-pulse">{t('loadingEllipsis')}</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 p-1 sm:p-4 text-[#332b25]">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-gild/20 pb-4 mb-2 select-none">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#4c1116] uppercase tracking-wider">
            {t('shopTitle', { defaultValue: 'Tavern Shop' })}
          </h2>
          <p className="font-hand text-xs text-[#c5bbae] mt-1">Unlock premium card decks</p>
        </div>
        {coins !== null && (
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber to-amber-deep text-[#1d1503] font-hand font-bold text-sm px-4 py-2 rounded-xl shadow-md border border-amber/40">
            <GoldCoinIcon className="w-4 h-4" />
            <span>{coins}</span>
          </div>
        )}
      </div>

      {/* Grid catalog */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SHOP_ITEMS.map((item) => {
          const isUnlocked = unlockedBacks.split(',').includes(item.id);
          const isActive = activeBack === item.id;
          return (
            <div
              key={item.id}
              className={`flex flex-col items-center justify-between rounded-[20px] border-2 p-5 bg-parchment-deep/80 backdrop-blur-sm shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md hover:scale-[1.02] ${
                isActive ? 'border-amber shadow-[0_0_15px_rgba(202,138,4,0.25)]' : 'border-gild/30'
              }`}
            >
              <div className="w-24 h-32 my-4 flex items-center justify-center filter drop-shadow-lg">
                <PlayingCard
                  faceDown={true}
                  className={`${item.class} pointer-events-none scale-100`}
                />
              </div>
              <div className="text-center w-full select-none mt-2">
                <p className="font-display text-base font-extrabold text-ember truncate">
                  {item.mnName}
                </p>
                <p className="font-hand text-xs text-[#c5bbae] mb-4 mt-1 font-semibold flex items-center justify-center gap-1">
                  {isUnlocked ? (
                    t('skinUnlocked')
                  ) : (
                    <>
                      <GoldCoinIcon className="w-3.5 h-3.5" />
                      <span>{item.cost}</span>
                    </>
                  )}
                </p>
                {isActive ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-xl bg-gild/10 py-2.5 font-hand text-xs text-[#c5bbae]/75 font-bold border border-gild/10"
                  >
                    {t('activeLabel')}
                  </button>
                ) : isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => handleEquip(item.id)}
                    className="w-full rounded-xl bg-gradient-to-r from-amber to-amber-deep text-[#1d1503] font-hand font-bold text-xs py-2.5 border border-amber/30 hover:brightness-110 active:scale-98 transition-all shadow-sm cursor-pointer"
                  >
                    {t('equipAction')}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={coins !== null && coins < item.cost}
                    onClick={() => handleBuy(item)}
                    className="w-full rounded-xl bg-[#4c1116] text-cream font-hand font-bold text-xs py-2.5 hover:bg-[#350e13] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-sm"
                  >
                    {t('buyAction')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
