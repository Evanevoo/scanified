/**
 * Preset invoice templates inspired by QuickBooks
 */

export const TEMPLATE_PRESETS = {
  modern: {
    name: 'Modern',
    description: 'Clean and minimal design with contemporary styling',
    layout_json: {
      logo_url: null,
      colors: {
        primary: '#2563eb',
        secondary: '#64748b'
      },
      fonts: {
        heading: 'Arial',
        body: 'Arial'
      },
      header: {
        text: '',
        show: false
      },
      footer: {
        text: 'Thank you for your business!',
        show: true
      },
      fields: {
        show_quantity: true,
        show_serial_number: false,
        show_barcode: true,
        show_start_date: true,
        show_rental_days: true,
        show_rate: true,
        show_total: true
      },
      columns: [
        { id: 'description', label: 'Description', visible: true, order: 0 },
        { id: 'quantity', label: 'Qty', visible: true, order: 1 },
        { id: 'barcode', label: 'Barcode', visible: true, order: 2 },
        { id: 'start_date', label: 'Start Date', visible: true, order: 3 },
        { id: 'rental_days', label: 'Days', visible: true, order: 4 },
        { id: 'unit_price', label: 'Rate', visible: true, order: 5 },
        { id: 'total_price', label: 'Total', visible: true, order: 6 }
      ]
    }
  },
  classic: {
    name: 'Classic',
    description: 'Traditional business invoice with professional styling',
    layout_json: {
      logo_url: null,
      colors: {
        primary: '#1e40af',
        secondary: '#334155'
      },
      fonts: {
        heading: 'Times New Roman',
        body: 'Georgia'
      },
      header: {
        text: 'INVOICE',
        show: true
      },
      footer: {
        text: 'Payment terms: Net 30 days. Thank you for your business.',
        show: true
      },
      fields: {
        show_quantity: true,
        show_serial_number: true,
        show_barcode: true,
        show_start_date: true,
        show_rental_days: true,
        show_rate: true,
        show_total: true
      },
      columns: [
        { id: 'description', label: 'Item Description', visible: true, order: 0 },
        { id: 'serial_number', label: 'Serial #', visible: true, order: 1 },
        { id: 'quantity', label: 'Quantity', visible: true, order: 2 },
        { id: 'start_date', label: 'Start Date', visible: true, order: 3 },
        { id: 'rental_days', label: 'Duration', visible: true, order: 4 },
        { id: 'unit_price', label: 'Rate', visible: true, order: 5 },
        { id: 'total_price', label: 'Amount', visible: true, order: 6 }
      ]
    }
  },
  bold: {
    name: 'Bold',
    description: 'Eye-catching design with vibrant colors and large headers',
    layout_json: {
      logo_url: null,
      colors: {
        primary: '#dc2626',
        secondary: '#991b1b'
      },
      fonts: {
        heading: 'Verdana',
        body: 'Verdana'
      },
      header: {
        text: '',
        show: false
      },
      footer: {
        text: 'We appreciate your business!',
        show: true
      },
      fields: {
        show_quantity: true,
        show_serial_number: false,
        show_barcode: true,
        show_start_date: true,
        show_rental_days: true,
        show_rate: true,
        show_total: true
      },
      columns: [
        { id: 'description', label: 'ITEM', visible: true, order: 0 },
        { id: 'barcode', label: 'CODE', visible: true, order: 1 },
        { id: 'quantity', label: 'QTY', visible: true, order: 2 },
        { id: 'rental_days', label: 'DAYS', visible: true, order: 3 },
        { id: 'unit_price', label: 'RATE', visible: true, order: 4 },
        { id: 'total_price', label: 'TOTAL', visible: true, order: 5 }
      ]
    }
  },
  compact: {
    name: 'Compact',
    description: 'Space-efficient design perfect for longer item lists',
    layout_json: {
      logo_url: null,
      colors: {
        primary: '#059669',
        secondary: '#047857'
      },
      fonts: {
        heading: 'Arial',
        body: 'Arial'
      },
      header: {
        text: '',
        show: false
      },
      footer: {
        text: 'Thank you!',
        show: true
      },
      fields: {
        show_quantity: true,
        show_serial_number: false,
        show_barcode: true,
        show_start_date: false,
        show_rental_days: true,
        show_rate: true,
        show_total: true
      },
      columns: [
        { id: 'description', label: 'Item', visible: true, order: 0 },
        { id: 'barcode', label: 'Code', visible: true, order: 1 },
        { id: 'quantity', label: 'Qty', visible: true, order: 2 },
        { id: 'rental_days', label: 'Days', visible: true, order: 3 },
        { id: 'unit_price', label: '$/Day', visible: true, order: 4 },
        { id: 'total_price', label: 'Total', visible: true, order: 5 }
      ]
    }
  }
};

export const getPresetTemplate = (presetName) => {
  return TEMPLATE_PRESETS[presetName] || null;
};

export const getAllPresets = () => {
  return Object.entries(TEMPLATE_PRESETS).map(([key, value]) => ({
    id: key,
    ...value
  }));
};

