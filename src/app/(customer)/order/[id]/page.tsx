'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Bell,
  Utensils,
  Sparkles,
  Receipt,
} from 'lucide-react';
import { formatPaiseToRupees } from '@/lib/money';

const STEPS = [
  { status: 'PLACED', label: 'Received' },
  { status: 'ACCEPTED', label: 'Confirmed' },
  { status: 'PREPARING', label: 'Preparing' },
  { status: 'READY', label: 'Ready' },
  { status: 'SERVED', label: 'Served' },
];

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: orderId } = use(params);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/public/orders`);
        const json = await res.json();
        if (json.data?.orders) {
          const found = json.data.orders.find((o: any) => o.id === orderId);
          if (found) setOrder(found);
        }
      } catch (err) {
        console.error('Failed to load order', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();

    // SSE connection for live status updates
    const eventSource = new EventSource('/api/public/stream');
    eventSource.addEventListener('order.updated', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        if (data.orderId === orderId) {
          setOrder((prev: any) => (prev ? { ...prev, status: data.status, version: data.version } : prev));
        }
      } catch {}
    });

    // Fallback safety poll every 4s for serverless resilience
    const pollTimer = setInterval(() => {
      fetchOrder();
    }, 4000);

    return () => {
      clearInterval(pollTimer);
      eventSource.close();
    };
  }, [orderId]);

  const currentStepIndex = STEPS.findIndex((s) => s.status === (order?.status || 'PLACED'));

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'PENDING_CONFIRMATION':
        return 'A staff member will verify your table order shortly.';
      case 'PLACED':
        return 'Order received. Kitchen queue is processing your ticket.';
      case 'ACCEPTED':
        return 'Confirmed by chefs! Cooking starts immediately.';
      case 'PREPARING':
        return `Dishes are actively being prepared on tandoor & stations.`;
      case 'READY':
        return 'Dishes are plated and being brought to your table!';
      case 'SERVED':
        return 'Served at your table. Enjoy your delicious meal!';
      case 'REJECTED':
        return `Order could not be prepared: ${order?.rejectionReason || 'Item sold out'}.`;
      case 'CANCELLED':
        return 'This order was cancelled.';
      default:
        return 'Tracking real-time kitchen status...';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans selection:bg-orange-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between shadow-md">
        <Link
          href="/menu"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Menu</span>
        </Link>
        <h1 className="text-sm font-black text-white">
          Order {order ? `#${String(order.orderNumber).padStart(3, '0')}` : 'Tracker'}
        </h1>
        <Link
          href="/orders"
          className="text-xs font-bold text-orange-400 hover:text-orange-300"
        >
          All Orders
        </Link>
      </header>

      <main className="p-4 space-y-5 max-w-lg mx-auto">
        {/* Status Card */}
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-lg shadow-orange-500/10">
            {order?.status === 'SERVED' ? (
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            ) : order?.status === 'REJECTED' || order?.status === 'CANCELLED' ? (
              <XCircle className="w-9 h-9 text-rose-400" />
            ) : (
              <Clock className="w-9 h-9 animate-pulse text-orange-400" />
            )}
          </div>

          <div aria-live="polite" className="space-y-1">
            <h2 className="text-xl font-black text-white capitalize tracking-tight">
              {(order?.status || 'PLACED').replace('_', ' ').toLowerCase()}
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              {getStatusMessage(order?.status || 'PLACED')}
            </p>
          </div>

          {/* Stepper */}
          {order?.status !== 'REJECTED' && order?.status !== 'CANCELLED' && (
            <div className="pt-4 flex items-center justify-between relative px-2">
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-800 -z-0" />
              {STEPS.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div key={step.status} className="flex flex-col items-center z-10 space-y-1.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                        isCurrent
                          ? 'bg-orange-500 text-white ring-4 ring-orange-500/20 shadow-lg shadow-orange-500/30'
                          : isPassed
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {isPassed && !isCurrent ? '✓' : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] font-bold ${
                        isCurrent ? 'text-orange-400' : isPassed ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/menu"
            className="py-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 font-bold text-center text-xs text-slate-200 rounded-2xl shadow-sm transition"
          >
            + Order More Dishes
          </Link>
          <Link
            href="/orders"
            className="py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 font-black text-center text-xs text-white rounded-2xl shadow-lg shadow-orange-500/20 transition"
          >
            View Table Session →
          </Link>
        </div>
      </main>
    </div>
  );
}