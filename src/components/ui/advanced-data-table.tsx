'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import {
	ChevronUp,
	ChevronDown,
	Search,
	Download,
	Eye,
	EyeOff,
	Columns,
	SortAsc,
	SortDesc,
	Edit,
	Trash2,
} from 'lucide-react';
import { HelpTooltip } from './help-tooltip';
import { ExportDialog } from './export-dialog';

export interface Column {
	id: string;
	header: string;
	accessorKey: string;
	cell?: (info: {
		getValue: () => unknown;
		row: { original: Record<string, unknown> };
	}) => React.ReactNode;
	sortable?: boolean;
	filterable?: boolean;
	visible?: boolean;
	width?: number;
	type?: 'text' | 'number' | 'date' | 'boolean' | 'currency' | 'url' | 'email';
}

interface AdvancedDataTableProps {
	data: Record<string, unknown>[];
	columns: Column[];
	title?: string;
	description?: string;
	onRowClick?: (row: Record<string, unknown>) => void;
	onEdit?: (row: Record<string, unknown>) => void;
	onDelete?: (row: Record<string, unknown>) => void;
	enableExport?: boolean;
	enableColumnVisibility?: boolean;
	enableSorting?: boolean;
	enableFiltering?: boolean;
	enablePagination?: boolean;
	pageSize?: number;
	className?: string;
}

export function AdvancedDataTable({
	data,
	columns,
	title = 'Data Table',
	description,
	onRowClick,
	onEdit,
	onDelete,
	enableExport = true,
	enableColumnVisibility = true,
	enableFiltering = true,
	enablePagination = true,
	pageSize = 100,
	className = '',
}: AdvancedDataTableProps) {
	const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
		null
	);
	const [filters, setFilters] = useState<Record<string, string>>({});
	const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
		new Set(columns.map(col => col.id))
	);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchTerm, setSearchTerm] = useState('');

	// Filter data based on search and column filters
	const filteredData = useMemo(() => {
		return data.filter(row => {
			// Global search
			if (searchTerm) {
				const searchLower = searchTerm.toLowerCase();
				const hasMatch = Object.values(row).some(value =>
					String(value || '')
						.toLowerCase()
						.includes(searchLower)
				);
				if (!hasMatch) return false;
			}

			// Column-specific filters
			for (const [columnId, filterValue] of Object.entries(filters)) {
				if (filterValue) {
					const column = columns.find(col => col.id === columnId);
					if (column) {
						const cellValue = row[column.accessorKey];
						const cellString = String(cellValue || '').toLowerCase();
						if (!cellString.includes(filterValue.toLowerCase())) {
							return false;
						}
					}
				}
			}

			return true;
		});
	}, [data, searchTerm, filters, columns]);

	// Sort data
	const sortedData = useMemo(() => {
		if (!sortConfig) return filteredData;

		return [...filteredData].sort((a, b) => {
			const aValue = a[sortConfig.key];
			const bValue = b[sortConfig.key];

			if (aValue === null || aValue === undefined) return 1;
			if (bValue === null || bValue === undefined) return -1;

			const aString = String(aValue);
			const bString = String(bValue);

			if (sortConfig.direction === 'asc') {
				return aString.localeCompare(bString, undefined, { numeric: true });
			} else {
				return bString.localeCompare(aString, undefined, { numeric: true });
			}
		});
	}, [filteredData, sortConfig]);

	// Paginate data
	const paginatedData = useMemo(() => {
		if (!enablePagination) return sortedData;

		const startIndex = (currentPage - 1) * pageSize;
		return sortedData.slice(startIndex, startIndex + pageSize);
	}, [sortedData, currentPage, pageSize, enablePagination]);

	// Get visible columns
	const visibleColumnsList = useMemo(() => {
		return columns.filter(col => visibleColumns.has(col.id));
	}, [columns, visibleColumns]);

	// Handle sorting
	const handleSort = useCallback((columnId: string) => {
		setSortConfig(prevConfig => {
			if (prevConfig?.key === columnId) {
				return prevConfig.direction === 'asc' ? { key: columnId, direction: 'desc' } : null;
			}
			return { key: columnId, direction: 'asc' };
		});
	}, []);

	// Handle column visibility toggle
	const toggleColumnVisibility = useCallback((columnId: string) => {
		setVisibleColumns(prev => {
			const newSet = new Set(prev);
			if (newSet.has(columnId)) {
				newSet.delete(columnId);
			} else {
				newSet.add(columnId);
			}
			return newSet;
		});
	}, []);

	// Handle filter change
	const handleFilterChange = useCallback((columnId: string, value: string) => {
		setFilters(prev => ({
			...prev,
			[columnId]: value,
		}));
	}, []);

	// Clear all filters
	const clearFilters = useCallback(() => {
		setFilters({});
		setSearchTerm('');
	}, []);

	// Calculate total pages
	const totalPages = Math.ceil(sortedData.length / pageSize);

	// Render cell content
	const renderCellContent = useCallback((row: Record<string, unknown>, column: Column) => {
		const value = row[column.accessorKey];

		if (column.cell) {
			return column.cell({
				getValue: () => value,
				row: { original: row },
			});
		}

		// Handle null/undefined values
		if (value === null || value === undefined) {
			return <span className="text-muted-foreground italic">—</span>;
		}

		// Handle objects and arrays
		if (typeof value === 'object') {
			if (Array.isArray(value)) {
				if (value.length === 0) {
					return <span className="text-muted-foreground italic">Empty</span>;
				}
				return (
					<span className="font-mono text-sm text-blue-600 dark:text-blue-400">
						[{value.length} items]
					</span>
				);
			} else {
				const keys = Object.keys(value);
				if (keys.length === 0) {
					return <span className="text-muted-foreground italic">Empty</span>;
				}
				return (
					<span className="font-mono text-sm text-purple-600 dark:text-purple-400">
						{`{${keys.length} fields}`}
					</span>
				);
			}
		}

		// Default cell rendering based on type
		switch (column.type) {
			case 'currency':
				return (
					<span className="font-mono text-green-600 dark:text-green-400">
						{typeof value === 'number' ? `$${value.toLocaleString()}` : String(value || '')}
					</span>
				);
			case 'number':
				return (
					<span className="font-mono">
						{typeof value === 'number' ? value.toLocaleString() : String(value || '')}
					</span>
				);
			case 'boolean':
				return (
					<Badge variant={value ? 'default' : 'secondary'} className="text-xs">
						{value ? 'Yes' : 'No'}
					</Badge>
				);
			case 'date':
				return (
					<span className="font-mono text-sm">
						{value ? new Date(value as string).toLocaleDateString() : ''}
					</span>
				);
			case 'url':
				return (
					<a
						href={String(value)}
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-600 dark:text-blue-400 hover:underline text-sm truncate max-w-xs block"
					>
						{String(value)}
					</a>
				);
			case 'email':
				return (
					<a
						href={`mailto:${String(value)}`}
						className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
					>
						{String(value)}
					</a>
				);
			default:
				const stringValue = String(value || '');
				if (stringValue.length > 50) {
					return (
						<span className="break-words whitespace-pre-wrap max-w-xs text-sm" title={stringValue}>
							{stringValue.substring(0, 47)}...
						</span>
					);
				}
				return (
					<span className="break-words whitespace-pre-wrap max-w-xs text-sm">{stringValue}</span>
				);
		}
	}, []);

	return (
		<Card className={`card-modern-mobile ${className}`}>
			<CardHeader className="pb-4">
				<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
					<div className="space-y-1">
						<CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
							<Columns className="h-5 w-5" />
							{title}
							<HelpTooltip
								content="Advanced data table with sorting, filtering, column visibility, and export capabilities."
								icon="info"
							/>
						</CardTitle>
						{description && <p className="text-sm text-muted-foreground">{description}</p>}
					</div>
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
						{enableExport && (
							<ExportDialog data={sortedData} dataType="aircraft">
								<Button variant="outline" size="sm" className="btn-touch w-full sm:w-auto">
									<Download className="h-4 w-4 mr-2" />
									Export
								</Button>
							</ExportDialog>
						)}
						{enableColumnVisibility && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => setVisibleColumns(new Set(columns.map(col => col.id)))}
								className="btn-touch w-full sm:w-auto"
							>
								<Eye className="h-4 w-4 mr-2" />
								Show All
							</Button>
						)}
					</div>
				</div>

				{/* Controls */}
				<div className="flex flex-col sm:flex-row gap-4 pt-4">
					{/* Search */}
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search all columns..."
							value={searchTerm}
							onChange={e => setSearchTerm(e.target.value)}
							className="pl-10"
						/>
					</div>

					{/* Filters */}
					{enableFiltering && (
						<div className="flex gap-2">
							{columns
								.slice(0, 3)
								.map(
									column =>
										column.filterable && (
											<Input
												key={column.id}
												placeholder={`Filter ${column.header}`}
												value={filters[column.id] || ''}
												onChange={e => handleFilterChange(column.id, e.target.value)}
												className="w-32"
											/>
										)
								)}
							{(Object.keys(filters).length > 0 || searchTerm) && (
								<Button variant="outline" size="sm" onClick={clearFilters}>
									Clear
								</Button>
							)}
						</div>
					)}
				</div>

				{/* Stats */}
				<div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
					<span>
						{sortedData.length} of {data.length} records
					</span>
					{Object.keys(filters).length > 0 && (
						<span>{Object.keys(filters).length} filters applied</span>
					)}
					<span>
						{visibleColumnsList.length} of {columns.length} columns visible
					</span>
				</div>
			</CardHeader>

			<CardContent className="p-0">
				<div className="overflow-x-auto">
					<Table className="table-mobile min-w-full">
						<TableHeader>
							<TableRow>
								{visibleColumnsList.map(column => (
									<TableHead
										key={column.id}
										className={`${
											column.sortable !== false ? 'cursor-pointer hover:bg-muted/50' : ''
										} select-none`}
										onClick={() => column.sortable !== false && handleSort(column.accessorKey)}
									>
										<div className="flex items-center gap-2">
											<span>{column.header}</span>
											{column.sortable !== false && (
												<div className="flex flex-col">
													{sortConfig?.key === column.accessorKey ? (
														sortConfig.direction === 'asc' ? (
															<SortAsc className="h-3 w-3 text-primary" />
														) : (
															<SortDesc className="h-3 w-3 text-primary" />
														)
													) : (
														<div className="flex flex-col">
															<ChevronUp className="h-3 w-3 opacity-30" />
															<ChevronDown className="h-3 w-3 opacity-30" />
														</div>
													)}
												</div>
											)}
											{enableColumnVisibility && (
												<Button
													variant="ghost"
													size="sm"
													className="h-4 w-4 p-0"
													onClick={e => {
														e.stopPropagation();
														toggleColumnVisibility(column.id);
													}}
												>
													<EyeOff className="h-3 w-3" />
												</Button>
											)}
										</div>
									</TableHead>
								))}
								{(onEdit || onDelete) && <TableHead className="w-20">Actions</TableHead>}
							</TableRow>
						</TableHeader>
						<TableBody>
							<AnimatePresence>
								{paginatedData.map((row, index) => (
									<motion.tr
										key={index}
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -20 }}
										transition={{ delay: index * 0.02 }}
										className={`group hover:bg-muted/30 transition-colors ${
											onRowClick ? 'cursor-pointer' : ''
										}`}
										onClick={() => onRowClick?.(row)}
									>
										{visibleColumnsList.map(column => (
											<TableCell key={column.id} className="py-3">
												{renderCellContent(row, column)}
											</TableCell>
										))}
										{(onEdit || onDelete) && (
											<TableCell className="py-3">
												<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
													{onEdit && (
														<Button
															variant="ghost"
															size="sm"
															onClick={e => {
																e.stopPropagation();
																onEdit(row);
															}}
														>
															<Edit className="h-3 w-3" />
														</Button>
													)}
													{onDelete && (
														<Button
															variant="ghost"
															size="sm"
															onClick={e => {
																e.stopPropagation();
																onDelete(row);
															}}
														>
															<Trash2 className="h-3 w-3" />
														</Button>
													)}
												</div>
											</TableCell>
										)}
									</motion.tr>
								))}
							</AnimatePresence>
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				{enablePagination && totalPages > 1 && (
					<div className="flex items-center justify-between px-6 py-4 border-t">
						<div className="text-sm text-muted-foreground">
							Showing {(currentPage - 1) * pageSize + 1} to{' '}
							{Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
								disabled={currentPage === 1}
							>
								Previous
							</Button>
							<span className="text-sm">
								Page {currentPage} of {totalPages}
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
								disabled={currentPage === totalPages}
							>
								Next
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
