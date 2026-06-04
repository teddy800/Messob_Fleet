import { useState } from 'react';
import { CheckCircle, X, Calendar, DollarSign, FileText, Gauge, Wrench, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { callMethod } from '@/lib/odooApi';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function CompleteMaintenanceDialog({ 
  open, 
  onOpenChange, 
  alert,
  onComplete 
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    service_date: format(new Date(), 'yyyy-MM-dd'),
    cost: '',
    parts_cost: '',
    labor_cost: '',
    description: '',
    service_provider: 'Internal',
    odometer: alert?.current_odometer || '',
    next_service_date: '',
    next_service_odometer: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.cost || parseFloat(formData.cost) < 0) {
      toast.error('Please enter a valid cost');
      return;
    }

    setLoading(true);
    
    try {
      await callMethod(
        'messob.fms.maintenance.alert',
        'action_complete_maintenance',
        [alert.id],
        {
          context: {
            service_date: formData.service_date,
            cost: parseFloat(formData.cost) || 0,
            parts_cost: parseFloat(formData.parts_cost) || 0,
            labor_cost: parseFloat(formData.labor_cost) || 0,
            description: formData.description || 'Maintenance completed as per alert',
            service_provider: formData.service_provider,
            odometer: parseInt(formData.odometer) || 0,
            next_service_date: formData.next_service_date || false,
            next_service_odometer: parseInt(formData.next_service_odometer) || false,
          }
        }
      );

      toast.success('Maintenance completed successfully', {
        description: `Maintenance log created and alert resolved`
      });

      onOpenChange(false);
      if (onComplete) onComplete();
      
    } catch (error) {
      console.error('Failed to complete maintenance:', error);
      toast.error('Failed to complete maintenance', {
        description: error.message || 'Please try again'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!alert) return null;

  const vehicleName = Array.isArray(alert.vehicle_id) ? alert.vehicle_id[1] : 'Unknown Vehicle';
  const serviceTypeName = alert.service_type ? 
    alert.service_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
    'Maintenance';

  const totalCost = (parseFloat(formData.cost) || 0) + (parseFloat(formData.parts_cost) || 0) + (parseFloat(formData.labor_cost) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[92vw] max-h-[92vh] overflow-hidden p-6">
        {/* Header */}
        <div className="pb-4 border-b">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Complete Maintenance
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {vehicleName} - {serviceTypeName}
          </p>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto max-h-[calc(92vh-200px)] pr-2 overflow-x-hidden">
          {/* Row 1: Service Date and Total Cost */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label htmlFor="service_date" className="flex items-center gap-2 mb-2 text-sm font-semibold">
                <Calendar className="h-4 w-4" />
                Service Date *
              </Label>
              <Input
                id="service_date"
                type="date"
                value={formData.service_date}
                onChange={(e) => handleChange('service_date', e.target.value)}
                required
                max={format(new Date(), 'yyyy-MM-dd')}
                className="h-11"
              />
            </div>

            <div>
              <Label htmlFor="cost" className="flex items-center gap-2 mb-2 text-sm font-semibold">
                <DollarSign className="h-4 w-4" />
                Total Cost (ETB) *
              </Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={(e) => handleChange('cost', e.target.value)}
                placeholder="0.00"
                required
                className="h-11"
              />
            </div>
          </div>

          {/* Row 2: Cost Breakdown */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Cost Breakdown (Optional)
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="parts_cost" className="mb-2 text-sm">Parts Cost (ETB)</Label>
                <Input
                  id="parts_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.parts_cost}
                  onChange={(e) => handleChange('parts_cost', e.target.value)}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>

              <div>
                <Label htmlFor="labor_cost" className="mb-2 text-sm">Labor Cost (ETB)</Label>
                <Input
                  id="labor_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.labor_cost}
                  onChange={(e) => handleChange('labor_cost', e.target.value)}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Odometer and Service Provider */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label htmlFor="odometer" className="flex items-center gap-2 mb-2 text-sm font-semibold">
                <Gauge className="h-4 w-4" />
                Current Odometer (km)
              </Label>
              <Input
                id="odometer"
                type="number"
                min="0"
                value={formData.odometer}
                onChange={(e) => handleChange('odometer', e.target.value)}
                placeholder="Current mileage"
                className="h-11"
              />
            </div>

            <div>
              <Label htmlFor="service_provider" className="flex items-center gap-2 mb-2 text-sm font-semibold">
                <Wrench className="h-4 w-4" />
                Service Provider
              </Label>
              <Input
                id="service_provider"
                type="text"
                value={formData.service_provider}
                onChange={(e) => handleChange('service_provider', e.target.value)}
                placeholder="e.g., Internal, Garage Name"
                className="h-11"
              />
            </div>
          </div>

          {/* Row 4: Work Description */}
          <div>
            <Label htmlFor="description" className="flex items-center gap-2 mb-2 text-sm font-semibold">
              <FileText className="h-4 w-4" />
              Work Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe the maintenance work performed, parts replaced, issues found, and any recommendations..."
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Row 5: Next Service Schedule */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Next Service Schedule (Optional)
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="next_service_date" className="mb-2 text-sm">Next Service Date</Label>
                <Input
                  id="next_service_date"
                  type="date"
                  value={formData.next_service_date}
                  onChange={(e) => handleChange('next_service_date', e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="h-11"
                />
              </div>

              <div>
                <Label htmlFor="next_service_odometer" className="mb-2 text-sm">Next Service Odometer (km)</Label>
                <Input
                  id="next_service_odometer"
                  type="number"
                  min="0"
                  value={formData.next_service_odometer}
                  onChange={(e) => handleChange('next_service_odometer', e.target.value)}
                  placeholder="e.g., 55000"
                  className="h-11"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Action Buttons Footer */}
        <div className="flex items-center gap-4 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1 h-11"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !formData.cost}
            className="flex-[2] h-11 bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Completing Maintenance...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Maintenance
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
