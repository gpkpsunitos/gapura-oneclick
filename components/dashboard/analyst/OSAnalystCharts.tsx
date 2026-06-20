/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/preserve-manual-memoization */
/**
 * @file OSAnalystCharts.tsx
 *
 * Main OS Analyst Dashboard Charts Component
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter } from 'lucide-react';
import { PrismMultiSelect } from '@/components/ui/PrismMultiSelect';
import { cn } from '@/lib/utils';
import type { Report } from '@/types';
import { DelayCodeReportTab } from '@/components/dashboard/tabs/DelayCodeReportTab';
import { DrilldownDrawer } from '@/components/chart-detail/DrilldownDrawer';

import {
    type OSAnalystChartsProps as AnalystChartsProps,
    OsTrendSection,
    OsStationAirlineSection,
    OsCgoSection
} from './os-charts';

export type { AnalystChartsProps };

export default function AnalystCharts({
    analytics,
    caseCategoryData,
    branchReportData,
    monthlyReportData,
    categoryByAreaData,
    categoryByBranchData,
    areaSubCategoryData,
    categoryByAirlinesData,
    monthlyComparisonData,
    filteredReports,
    terminalAreaCategoryData,
    apronAreaCategoryData,
    generalCategoryData,
    caseClassificationData = [],
    comparisonData,
    globalFilters,
    setGlobalFilters,
    availableOptions,
}: AnalystChartsProps) {
    const TABS = ['stations_airlines', 'tren', 'delay_code', 'cgo'] as const;
    type AnalystTab = typeof TABS[number];
    const TAB_LABELS: Record<AnalystTab, string> = {
        stations_airlines: 'Stations & Airlines',
        tren: 'Trend & Category',
        delay_code: 'Delay Code Report',
        cgo: 'CGO Cargo',
    };
    const [activeTab, setActiveTab] = useState<AnalystTab>('stations_airlines');
    const [isGlobalFilterCollapsed, setIsGlobalFilterCollapsed] = useState(true);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerTitle, setDrawerTitle] = useState('');
    const [drawerData, setDrawerData] = useState<Report[]>([]);

    const openDrawer = (title: string, data: Report[]) => {
        setDrawerTitle(title);
        setDrawerData(data);
        setDrawerOpen(true);
    };

    const closeDrawer = () => {
        setDrawerOpen(false);
    };

    const drilldownByBranchCategory = (branch: string, category: string, area?: string) => {
        const filtered = (filteredReports as Report[]).filter((r: any) => {
            const code = r.stations?.code || r.branch || r.reporting_branch || '';
            const cat = (r.terminal_area_category || r.apron_area_category || r.general_category || '').trim();
            if (code !== branch) return false;
            if (area) {
                const rArea = (r.area || '').toLowerCase();
                if (area === 'Terminal Area' && rArea !== 'terminal area') return false;
                if (area === 'Apron Area' && rArea !== 'apron area') return false;
                if (area === 'General' && rArea !== 'general') return false;
            }
            if (category && cat !== category) return false;
            return true;
        });
        const label = area
            ? `${branch} — ${category} (${area})`
            : `${branch} — ${category}`;
        openDrawer(label, filtered);
    };

    return (
        <>
        <div className="space-y-6">
            {/* Global Filters Section */}
            <div className="relative z-50 bg-[oklch(1_0_0_/_0.4)] backdrop-blur-2xl border border-[oklch(1_0_0_/_0.1)] shadow-inner-rim rounded-2xl mb-4 sm:mb-6">
                <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-[oklch(1_0_0_/_0.05)]">
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                        <Filter size={14} className="text-[var(--brand-emerald-500)] sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Global Dashboard Filter</span>
                        <span className="sm:hidden">Filters</span>
                    </h3>
                    <button
                        onClick={() => setIsGlobalFilterCollapsed(!isGlobalFilterCollapsed)}
                        aria-label={isGlobalFilterCollapsed ? 'Tampilkan filter' : 'Sembunyikan filter'}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors text-xs font-bold text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    >
                        <span>{isGlobalFilterCollapsed ? 'Tampilkan' : 'Sembunyikan'}</span>
                        <motion.svg 
                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            animate={{ rotate: isGlobalFilterCollapsed ? 0 : 180 }}
                            transition={{ duration: 0.2 }}
                        >
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </motion.svg>
                    </button>
                </div>
                
                <AnimatePresence>
                    {!isGlobalFilterCollapsed && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                        >
                            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 bg-[var(--surface-0)]/30 rounded-b-2xl">
                                <PrismMultiSelect
                                    label="Hub"
                                    placeholder="Semua Hub..."
                                    options={availableOptions.hubs.map(h => ({ label: h, value: h }))}
                                    values={globalFilters.hubs}
                                    onChange={(vals) => setGlobalFilters(prev => ({ ...prev, hubs: vals }))}
                                  />
                                <PrismMultiSelect
                                    label="Branch"
                                    placeholder="Semua Branch..."
                                    options={availableOptions.branches.map(b => ({ label: b, value: b }))}
                                    values={globalFilters.branches}
                                    onChange={(vals) => setGlobalFilters(prev => ({ ...prev, branches: vals }))}
                                  />
                                <PrismMultiSelect
                                    label="Airline"
                                    placeholder="Semua Airline..."
                                    options={availableOptions.airlines.map(a => ({ label: a, value: a }))}
                                    values={globalFilters.airlines}
                                    onChange={(vals) => setGlobalFilters(prev => ({ ...prev, airlines: vals }))}
                                  />
                                <PrismMultiSelect
                                    label="Kategori"
                                    placeholder="Semua Kategori..."
                                    options={availableOptions.categories.map(c => ({ label: c, value: c }))}
                                    values={globalFilters.categories}
                                    onChange={(vals) => setGlobalFilters(prev => ({ ...prev, categories: vals }))}
                                  />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Tab Bar - PRISM Floating Capsule */}
            <div className="flex justify-center sticky top-0 z-40 py-1 sm:py-2">
                <div className="flex p-1 sm:p-1.5 rounded-2xl bg-[oklch(1_0_0_/_0.4)] backdrop-blur-2xl border border-[oklch(1_0_0_/_0.1)] shadow-inner-rim max-w-full overflow-x-auto no-scrollbar">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                'px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[11px] font-bold uppercase tracking-wider sm:tracking-widest transition-all duration-300 whitespace-nowrap relative flex items-center gap-1 sm:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                                activeTab === tab
                                    ? 'text-black'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[oklch(1_0_0_/_0.1)]'
                            )}
                        >
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-gradient-to-br from-[var(--brand-aurora-1)] to-[var(--brand-aurora-2)] rounded-xl shadow-lg shadow-emerald-500/20"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10">{TAB_LABELS[tab]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Slide 2: General Categories & Volume Trends */}
            {activeTab === 'tren' && (
                <OsTrendSection
                    filteredReports={filteredReports}
                    caseCategoryData={caseCategoryData}
                    categoryByAreaData={categoryByAreaData}
                    categoryByBranchData={categoryByBranchData}
                    areaSubCategoryData={areaSubCategoryData}
                    terminalAreaCategoryData={terminalAreaCategoryData}
                    apronAreaCategoryData={apronAreaCategoryData}
                    generalCategoryData={generalCategoryData}
                    caseClassificationData={caseClassificationData}
                    analytics={analytics}
                    monthlyComparisonData={monthlyComparisonData}
                    monthlyReportData={monthlyReportData}
                    comparisonData={comparisonData}
                    openDrawer={openDrawer}
                    drilldownByBranchCategory={drilldownByBranchCategory}
                />
            )}

            {/* Slide 3 & 4: Stations & Airlines */}
            {activeTab === 'stations_airlines' && (
                <OsStationAirlineSection
                    filteredReports={filteredReports}
                    branchReportData={branchReportData}
                    categoryByBranchData={categoryByBranchData}
                    categoryByAirlinesData={categoryByAirlinesData}
                    openDrawer={openDrawer}
                />
            )}

            {/* Slide Delay Code: Delay Code Report */}
            {activeTab === 'delay_code' && (
                <div className="mt-8">
                    <DelayCodeReportTab reports={filteredReports as Report[]} />
                </div>
            )}

            {/* Slide CGO: CGO Case Category */}
            {activeTab === 'cgo' && (
                <OsCgoSection
                    filteredReports={filteredReports}
                    openDrawer={openDrawer}
                />
            )}

        </div>

        <DrilldownDrawer
            isOpen={drawerOpen}
            onClose={closeDrawer}
            title={drawerTitle}
            data={drawerData as any[]}
        />
        </>
    );
}
