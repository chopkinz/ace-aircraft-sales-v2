'use client';

import React, { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import {
	Download,
	FileSpreadsheet,
	FileText,
	Database,
	Filter,
	Settings,
	CheckCircle,
	Info,
	Eye,
} from 'lucide-react';
import { HelpTooltip } from './help-tooltip';
import toast from 'react-hot-toast';

interface ExportDialogProps {
	children: React.ReactNode;
	data: Record<string, unknown>[];
	dataType: 'aircraft' | 'market' | 'reports';
	onExport?: (format: string, selectedFields: string[], filters?: Record<string, unknown>) => void;
}

interface ExportFormat {
	id: string;
	name: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	extensions: string[];
	supported: boolean;
}

const exportFormats: ExportFormat[] = [
	{
		id: 'csv',
		name: 'CSV',
		description: 'Comma-separated values for spreadsheet applications',
		icon: FileText,
		extensions: ['.csv'],
		supported: true,
	},
	{
		id: 'excel',
		name: 'Excel',
		description: 'Microsoft Excel format (.xlsx)',
		icon: FileSpreadsheet,
		extensions: ['.xlsx'],
		supported: true,
	},
	{
		id: 'json',
		name: 'JSON',
		description: 'JavaScript Object Notation for developers',
		icon: Database,
		extensions: ['.json'],
		supported: true,
	},
	{
		id: 'pdf',
		name: 'PDF Report',
		description: 'Portable Document Format with formatting',
		icon: FileText,
		extensions: ['.pdf'],
		supported: false, // Coming soon
	},
];

export function ExportDialog({ children, data, dataType }: ExportDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedFormat, setSelectedFormat] = useState('csv');
	const [selectedFields, setSelectedFields] = useState<string[]>([]);
	const [showPreview, setShowPreview] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [filters] = useState({
		dateRange: { start: '', end: '' },
		status: '',
		manufacturer: '',
		priceRange: { min: '', max: '' },
	});

	// Get available fields based on data type
	const getAvailableFields = () => {
		if (!data || data.length === 0) return [];

		const sampleRecord = data[0];
		return Object.keys(sampleRecord).map(key => ({
			id: key,
			label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
			category: getFieldCategory(key),
		}));
	};

	const getFieldCategory = (fieldName: string): string => {
		const categories = {
			basic: ['id', 'manufacturer', 'model', 'year', 'registration', 'serialNumber'],
			pricing: ['price', 'askingPrice', 'currency', 'marketValue'],
			location: ['location', 'baseCity', 'baseState', 'baseCountry', 'baseAirportId'],
			technical: ['totalTimeHours', 'engineCount', 'engineType', 'maxSpeed', 'range'],
			market: ['status', 'forsale', 'marketStatus', 'daysOnMarket', 'dateListed'],
			contact: ['contactName', 'contactPhone', 'contactEmail', 'contactCompany'],
			system: ['createdAt', 'updatedAt', 'lastUpdated', 'dataSource'],
		};

		for (const [category, fields] of Object.entries(categories)) {
			if (fields.some(field => fieldName.toLowerCase().includes(field.toLowerCase()))) {
				return category;
			}
		}
		return 'other';
	};

	const availableFields = getAvailableFields();
	const fieldCategories = [...new Set(availableFields.map(f => f.category))];

	// Initialize selected fields with common fields
	const initialized = React.useRef(false);
	React.useEffect(() => {
		if (availableFields.length > 0 && !initialized.current) {
			const commonFields = ['manufacturer', 'model', 'year', 'price', 'location', 'status'];
			setSelectedFields(
				availableFields.filter(field => commonFields.includes(field.id)).map(field => field.id)
			);
			initialized.current = true;
		}
	}, [availableFields]);

	const handleFieldToggle = (fieldId: string) => {
		setSelectedFields(prev =>
			prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
		);
	};

	const handleSelectAll = (category: string) => {
		const categoryFields = availableFields.filter(f => f.category === category).map(f => f.id);
		const allSelected = categoryFields.every(field => selectedFields.includes(field));

		if (allSelected) {
			setSelectedFields(prev => prev.filter(field => !categoryFields.includes(field)));
		} else {
			setSelectedFields(prev => [...new Set([...prev, ...categoryFields])]);
		}
	};

	const getPreviewData = () => {
		if (!showPreview || !data || data.length === 0) return [];

		return data.slice(0, 5).map(record => {
			const preview: Record<string, unknown> = {};
			selectedFields.forEach(field => {
				preview[field] = (record as Record<string, unknown>)[field] || 'N/A';
			});
			return preview;
		});
	};

	const handleExport = async () => {
		if (selectedFields.length === 0) {
			toast.error('Please select at least one field to export');
			return;
		}

		setIsExporting(true);
		try {
			const exportData = {
				format: selectedFormat,
				fields: selectedFields,
				filters,
				dataType,
			};

			// Call the export API
			const response = await fetch('/api/export/data', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(exportData),
			});

			if (response.ok) {
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.style.display = 'none';
				a.href = url;
				a.download = `aircraft-export-${new Date().toISOString().split('T')[0]}.${exportFormats
					.find(f => f.id === selectedFormat)
					?.extensions[0]?.slice(1)}`;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);

				toast.success(`Export completed successfully!`);
				setIsOpen(false);
			} else {
				throw new Error('Export failed');
			}
		} catch (error) {
			console.error('Export error:', error);
			toast.error('Export failed. Please try again.');
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
				<DialogHeader className="flex-shrink-0">
					<DialogTitle className="flex items-center gap-3 text-2xl">
						<div className="p-2 rounded-lg bg-primary/10">
							<Download className="h-6 w-6 text-primary" />
						</div>
						Export Data
						<HelpTooltip
							content="Export aircraft data in various formats with custom field selection and filtering options."
							icon="info"
						/>
					</DialogTitle>
					<DialogDescription className="text-base">
						Choose export format, select fields, and configure filters for your data export
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto space-y-6">
					{/* Export Format Selection */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2 text-lg">
								<Settings className="h-5 w-5" />
								Export Format
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{exportFormats.map(format => {
									const IconComponent = format.icon;
									return (
										<motion.div
											key={format.id}
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
												selectedFormat === format.id
													? 'border-primary bg-primary/5'
													: 'border-border hover:border-primary/50'
											} ${!format.supported ? 'opacity-50 cursor-not-allowed' : ''}`}
											onClick={() => format.supported && setSelectedFormat(format.id)}
										>
											<div className="flex items-start gap-3">
												<IconComponent className="h-6 w-6 text-primary mt-1" />
												<div className="flex-1">
													<div className="flex items-center gap-2">
														<h3 className="font-semibold">{format.name}</h3>
														{!format.supported && (
															<Badge variant="secondary" className="text-xs">
																Coming Soon
															</Badge>
														)}
													</div>
													<p className="text-sm text-muted-foreground mt-1">{format.description}</p>
													<div className="flex gap-1 mt-2">
														{format.extensions.map(ext => (
															<Badge key={ext} variant="outline" className="text-xs">
																{ext}
															</Badge>
														))}
													</div>
												</div>
												{selectedFormat === format.id && (
													<CheckCircle className="h-5 w-5 text-primary" />
												)}
											</div>
										</motion.div>
									);
								})}
							</div>
						</CardContent>
					</Card>

					{/* Field Selection */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2 text-lg">
								<Filter className="h-5 w-5" />
								Select Fields
								<Badge variant="secondary" className="ml-auto">
									{selectedFields.length} selected
								</Badge>
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{fieldCategories.map(category => {
									const categoryFields = availableFields.filter(f => f.category === category);
									const selectedInCategory = categoryFields.filter(f =>
										selectedFields.includes(f.id)
									).length;
									const allSelected = selectedInCategory === categoryFields.length;
									const someSelected = selectedInCategory > 0;

									return (
										<div key={category} className="space-y-2">
											<div className="flex items-center justify-between">
												<Label className="text-sm font-medium capitalize">{category} Fields</Label>
												<div className="flex items-center gap-2">
													<span className="text-xs text-muted-foreground">
														{selectedInCategory}/{categoryFields.length}
													</span>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleSelectAll(category)}
														className="h-6 px-2 text-xs"
													>
														{allSelected ? 'None' : someSelected ? 'All' : 'All'}
													</Button>
												</div>
											</div>
											<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
												{categoryFields.map(field => (
													<div key={field.id} className="flex items-center space-x-2">
														<Checkbox
															id={field.id}
															checked={selectedFields.includes(field.id)}
															onCheckedChange={() => handleFieldToggle(field.id)}
														/>
														<Label
															htmlFor={field.id}
															className="text-sm font-normal cursor-pointer"
														>
															{field.label}
														</Label>
													</div>
												))}
											</div>
											{category !== fieldCategories[fieldCategories.length - 1] && <Separator />}
										</div>
									);
								})}
							</div>
						</CardContent>
					</Card>

					{/* Preview */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2 text-lg">
								<Eye className="h-5 w-5" />
								Preview
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowPreview(!showPreview)}
									className="ml-auto"
								>
									{showPreview ? 'Hide' : 'Show'} Preview
								</Button>
							</CardTitle>
						</CardHeader>
						{showPreview && (
							<CardContent>
								<div className="bg-muted/30 rounded-lg p-4 max-h-64 overflow-auto">
									{getPreviewData().length > 0 ? (
										<div className="space-y-2">
											<div className="text-sm font-medium text-muted-foreground mb-2">
												Preview of first 5 records:
											</div>
											<pre className="text-xs whitespace-pre-wrap">
												{JSON.stringify(getPreviewData(), null, 2)}
											</pre>
										</div>
									) : (
										<div className="text-center py-8 text-muted-foreground">
											<Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
											<p>Select fields to preview data</p>
										</div>
									)}
								</div>
							</CardContent>
						)}
					</Card>
				</div>

				{/* Footer Actions */}
				<div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
					<div className="text-sm text-muted-foreground">
						{selectedFields.length} fields selected • {data?.length || 0} records
					</div>
					<div className="flex gap-3">
						<Button variant="outline" onClick={() => setIsOpen(false)} disabled={isExporting}>
							Cancel
						</Button>
						<Button
							onClick={handleExport}
							disabled={selectedFields.length === 0 || isExporting}
							className="gradient-primary"
						>
							{isExporting ? (
								<>
									<Download className="h-4 w-4 mr-2 animate-spin" />
									Exporting...
								</>
							) : (
								<>
									<Download className="h-4 w-4 mr-2" />
									Export Data
								</>
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
