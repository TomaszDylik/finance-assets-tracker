"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlusCircle, BarChart3, Search, DollarSign, ArrowRightLeft } from "lucide-react";

interface UserManualModalProps {
  open: boolean;
  onClose: () => void;
}

export function UserManualModal({ open, onClose }: UserManualModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#0a0a0a] border-white/10 sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">User Guide</DialogTitle>
          <DialogDescription className="text-white/50">
            Everything you need to know to get the most out of FinTrack.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="transactions" className="mt-1">
          <TabsList>
            <TabsTrigger value="transactions" className="gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" />
              Adding Transactions
            </TabsTrigger>
            <TabsTrigger value="chart" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Understanding the Chart
            </TabsTrigger>
          </TabsList>

          {/* --- Tab 1: Adding Transactions --- */}
          <TabsContent value="transactions" className="space-y-5 text-sm leading-relaxed">
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-white font-medium">
                <Search className="h-4 w-4 text-emerald-400 shrink-0" />
                <h3>Ticker Search</h3>
              </div>
              <p className="text-white/60 pl-6">
                Search by <span className="text-white font-medium">Company Name</span> (e.g.,
                &quot;Apple&quot;) or by <span className="text-white font-medium">Ticker Symbol</span>.
                If the ISIN search fails, try the short Ticker symbol
                (e.g., <code className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-400 text-xs">PKO.WA</code>).
              </p>
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2 text-white font-medium">
                <DollarSign className="h-4 w-4 text-blue-400 shrink-0" />
                <h3>Price &amp; Currency</h3>
              </div>
              <p className="text-white/60 pl-6">
                Enter the asset price in its{" "}
                <span className="text-white font-medium">original currency</span>
                {" "}(e.g., USD for US stocks, EUR for European ETFs).
                This is the price per share at the time of purchase.
              </p>
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2 text-white font-medium">
                <ArrowRightLeft className="h-4 w-4 text-purple-400 shrink-0" />
                <h3>Settlement Currency <span className="text-amber-400 text-xs ml-1">Important</span></h3>
              </div>
              <p className="text-white/60 pl-6">
                Select the currency you{" "}
                <span className="text-white font-medium">actually paid with</span>
                {" "}(e.g., PLN). The app automatically calculates the{" "}
                <span className="text-white font-medium">historical exchange rate</span>
                {" "}(e.g., USD → PLN) from the purchase date to track your real cost.
              </p>
              <div className="ml-6 mt-2 bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-white/50">
                <span className="text-amber-400 font-medium">Example:</span> You buy AAPL
                at $150 USD, paying in PLN. FinTrack fetches the USD/PLN rate from
                that day and converts your cost to PLN automatically.
              </div>
            </section>
          </TabsContent>

          {/* --- Tab 2: Understanding the Chart --- */}
          <TabsContent value="chart" className="space-y-5 text-sm leading-relaxed">
            <section className="space-y-2">
              <h3 className="text-white font-medium">0% Baseline</h3>
              <p className="text-white/60">
                The chart starts at{" "}
                <span className="text-white font-medium">0%</span>. It shows your{" "}
                <span className="text-white font-medium">Percentage Return</span>
                {" "}over time — not the raw portfolio value. This lets you see
                true performance regardless of how much you have invested.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-white font-medium">Colors</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-3 rounded-sm bg-emerald-500 mt-1 shrink-0" />
                  <p className="text-white/60">
                    <span className="text-emerald-400 font-medium">Green Gradient</span>
                    {" "}— You are in <span className="text-white font-medium">profit</span>
                    {" "}(return above 0%).
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-3 rounded-sm bg-rose-500 mt-1 shrink-0" />
                  <p className="text-white/60">
                    <span className="text-rose-400 font-medium">Red Gradient</span>
                    {" "}— You are in <span className="text-white font-medium">loss</span>
                    {" "}(return below 0%).
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-white font-medium">Dotted Line (Benchmark)</h3>
              <div className="flex items-start gap-3">
                <div className="w-5 h-0.5 border-t-2 border-dashed border-slate-400 mt-2 shrink-0" />
                <p className="text-white/60">
                  This represents the{" "}
                  <span className="text-white font-medium">S&amp;P 500</span> benchmark.
                  If your solid line is{" "}
                  <span className="text-emerald-400 font-medium">ABOVE</span>
                  {" "}the dotted line, you are{" "}
                  <span className="text-white font-medium">beating the market</span>!
                </p>
              </div>
              <div className="mt-2 bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-white/50">
                <span className="text-blue-400 font-medium">Tip:</span> Toggle the
                &quot;vs S&amp;P 500&quot; button on the chart to show or hide the
                benchmark comparison.
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
