import React, { useState, useEffect, useRef } from 'react';
import { apiCall } from '../shared/api.js';

// Formatting helpers
function fmtQty(val) {
  if (val == null || val === '') return '—';
  const n = Number(val);
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 5 });
}

function fmtDate(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch (e) {
    return '—';
  }
}

function exportToExcel(data, fileName = 'SafetyStock_ItemMaster.xls') {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <style>
        table { border-collapse: collapse; }
        th { background-color: #ea580c; color: #ffffff; font-weight: bold; border: 1px solid #c2410c; padding: 10px 12px; font-family: sans-serif; font-size: 11pt; }
        td { border: 1px solid #e5e7eb; padding: 8px 10px; font-family: sans-serif; font-size: 10pt; }
        .text { mso-number-format: "\\@"; text-align: left; }
        .center { text-align: center; }
        .number { mso-number-format: "#,##0.00"; text-align: right; }
        .date { mso-number-format: "YYYY\\-MM\\-DD HH\\:MM"; text-align: center; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Item Code</th>
            <th>Item Type</th>
            <th>Item Description</th>
            <th>Safety Stock</th>
            <th>Purchasing Warehouse</th>
            <th>Production Warehouse</th>
            <th>Created By</th>
            <th>Created Date</th>
            <th>Last Maint By</th>
            <th>Last Maint Date</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.forEach(item => {
    const safetyStock = Number(item.SaftyStock || 0);
    const createdDateStr = item.CreatedDate ? new Date(item.CreatedDate).toISOString().replace('T', ' ').substring(0, 16) : '';
    const maintDateStr = item.LastMaintDate ? new Date(item.LastMaintDate).toISOString().replace('T', ' ').substring(0, 16) : '';

    html += `
      <tr>
        <td class="text">${item.ItemCode || ''}</td>
        <td class="center">${item.ItemType || ''}</td>
        <td>${item.ItemDescription || ''}</td>
        <td class="number">${safetyStock}</td>
        <td class="text">${item.PurchasingWarehouse || ''}</td>
        <td class="text">${item.ProducationWarehouse || ''}</td>
        <td class="text">${item.CreatedBy || ''}</td>
        <td class="date">${createdDateStr}</td>
        <td class="text">${item.LastMaintBy || ''}</td>
        <td class="date">${maintDateStr}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function TypeBadge({ type }) {
  if (!type) return <span style={{ color: 'var(--muted)' }}>—</span>;
  const isRaw = type.toUpperCase() === 'R';
  const isPack = type.toUpperCase() === 'P';
  const bg = isRaw ? 'var(--blue-soft)' : isPack ? 'var(--amber-soft)' : 'var(--soft)';
  const color = isRaw ? 'var(--blue)' : isPack ? 'var(--amber)' : 'var(--muted)';
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: '6px',
      background: bg,
      color: color,
      border: `0.5px solid ${isRaw ? 'rgba(37,99,235,0.15)' : isPack ? 'rgba(217,119,6,0.15)' : 'var(--border)'}`
    }}>
      {type}
    </span>
  );
}

export default function SaftyStockItemMaster({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('ALL'); // 'ALL', 'R', 'P', 'OTHERS'
  const [sortField, setSortField] = useState('ItemCode');
  const [sortAsc, setSortAsc] = useState(true);

  // Modal forms state
  const [showFormModal, setShowFormModal] = useState(false);
  const [formType, setFormType] = useState('ADD'); // 'ADD' or 'EDIT'
  const [editItem, setEditItem] = useState({
    ID: 0,
    ItemID: 0,
    ItemCode: '',
    SaftyStock: 0,
    PurchasingWarehouse: '',
    ProducationWarehouse: '',
    ItemType: ''
  });

  // Autocomplete Item Search State
  const [itemSearchText, setItemSearchText] = useState('');
  const [itemSearchResults, setItemSearchResults] = useState([]);
  const [itemSearchLoading, setItemSearchLoading] = useState(false);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);

  // Modal Saving State
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const autocompleteRef = useRef(null);

  // Close autocomplete on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowResultsDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch items list
  async function load() {
    setLoading(true);
    setError('');
    try {
      const d = await apiCall('Get Safety Stock Items', null, { User: user.Username });
      if (d.State !== 0) {
        setError(d.Message || 'Failed to load safety stock items');
        setItems([]);
      } else {
        setItems(d.List0 || []);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [user]);

  // Autocomplete Search Debounce effect
  useEffect(() => {
    if (!itemSearchText || itemSearchText.length < 2 || formType === 'EDIT') {
      setItemSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setItemSearchLoading(true);
      try {
        const d = await apiCall('Search Items', { SearchPattern: itemSearchText });
        if (d.State === 0) {
          setItemSearchResults(d.List0 || []);
          setShowResultsDropdown(true);
        }
      } catch (e) {
        console.error('Error autocomplete searching items:', e);
      }
      setItemSearchLoading(false);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [itemSearchText, formType]);

  // Filter items based on search query and item type
  const filteredItems = items.filter(item => {
    const code = (item.ItemCode || '').toLowerCase();
    const desc = (item.ItemDescription || '').toLowerCase();
    const type = (item.ItemType || '').toLowerCase();
    const purchWH = (item.PurchasingWarehouse || '').toLowerCase();
    const prodWH = (item.ProducationWarehouse || '').toLowerCase();

    const matchesSearch = code.includes(search.toLowerCase()) || 
                          desc.includes(search.toLowerCase()) ||
                          purchWH.includes(search.toLowerCase()) ||
                          prodWH.includes(search.toLowerCase());

    const matchesType = 
      activeType === 'ALL' ||
      (activeType === 'R' && type === 'r') ||
      (activeType === 'P' && type === 'p') ||
      (activeType === 'OTHERS' && type !== 'r' && type !== 'p');

    return matchesSearch && matchesType;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'SaftyStock') {
      valA = Number(valA || 0);
      valB = Number(valB || 0);
    } else if (sortField === 'CreatedDate' || sortField === 'LastMaintDate') {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    } else {
      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  function handleSort(field) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  // Open Modal for Add
  function openAdd() {
    setFormType('ADD');
    setEditItem({
      ID: 0,
      ItemID: 0,
      ItemCode: '',
      SaftyStock: 0,
      PurchasingWarehouse: '',
      ProducationWarehouse: '',
      ItemType: ''
    });
    setItemSearchText('');
    setItemSearchResults([]);
    setModalError('');
    setShowFormModal(true);
  }

  // Open Modal for Edit
  function openEdit(item) {
    setFormType('EDIT');
    setEditItem({
      ID: item.ID,
      ItemID: item.ItemID,
      ItemCode: item.ItemCode,
      SaftyStock: item.SaftyStock || 0,
      PurchasingWarehouse: item.PurchasingWarehouse || '',
      ProducationWarehouse: item.ProducationWarehouse || '',
      ItemType: item.ItemType || ''
    });
    setItemSearchText(item.ItemCode);
    setModalError('');
    setShowFormModal(true);
  }

  // Handle item selection in autocomplete
  function selectItem(selected) {
    setEditItem(prev => ({
      ...prev,
      ItemID: selected.ItemID,
      ItemCode: selected.ItemCode,
      ItemType: selected.ItemType || ''
    }));
    setItemSearchText(selected.ItemCode);
    setShowResultsDropdown(false);
  }

  // Handle Save
  async function handleSave(e) {
    e.preventDefault();
    if (!editItem.ItemCode) {
      setModalError('Please select or enter an Item.');
      return;
    }
    if (Number(editItem.SaftyStock) < 0) {
      setModalError('Safety stock quantity must be 0 or greater.');
      return;
    }

    setModalLoading(true);
    setModalError('');
    try {
      const res = await apiCall('Save Safety Stock Item', editItem);
      if (res.State !== 0) {
        setModalError(res.Message || 'Failed to save safety stock item.');
      } else {
        setShowFormModal(false);
        load();
      }
    } catch (err) {
      setModalError(err.message);
    }
    setModalLoading(false);
  }

  // Open Delete confirmation
  function openDelete(item) {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  }

  // Handle Delete
  async function handleDelete() {
    if (!itemToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await apiCall('Delete Safety Stock Item', { ID: itemToDelete.ID });
      if (res.State !== 0) {
        alert(res.Message || 'Failed to delete record.');
      } else {
        setShowDeleteConfirm(false);
        setItemToDelete(null);
        load();
      }
    } catch (err) {
      alert(err.message);
    }
    setDeleteLoading(false);
  }

  // KPI Calculations
  const totalRecords = filteredItems.length;
  const totalStockQty = filteredItems.reduce((sum, item) => sum + Number(item.SaftyStock || 0), 0);
  const rawCount = filteredItems.filter(item => (item.ItemType || '').toUpperCase() === 'R').length;
  const packCount = filteredItems.filter(item => (item.ItemType || '').toUpperCase() === 'P').length;
  const othersCount = filteredItems.filter(item => (item.ItemType || '').toUpperCase() !== 'R' && (item.ItemType || '').toUpperCase() !== 'P').length;

  const uniqueWarehouses = new Set(
    filteredItems.flatMap(item => [item.PurchasingWarehouse, item.ProducationWarehouse].filter(Boolean))
  ).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Safety Stock Item Master</div>
          <div className="page-sub">Manage and monitor safety stock threshold limits across warehouses</div>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <button 
            className="btn-primary" 
            onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            ➕ Add Safety Stock
          </button>
          <button 
            className="btn-primary" 
            onClick={() => exportToExcel(sortedItems)} 
            disabled={loading || sortedItems.length === 0}
            style={{
              background: '#16a34a',
              borderColor: '#16a34a',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 38,
              padding: '0 16px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              border: 'none',
              transition: 'background .15s'
            }}
          >
            📥 Export Excel
          </button>
        </div>
      </div>

      {error && <div className="err-page">{error}</div>}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Total Configured Items</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{totalRecords}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Unique active records</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Total Safety Stock Limit</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--orange2)' }}>{fmtQty(totalStockQty)}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Aggregated quantity threshold</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Breakdown by Item Type</div>
          <div style={{ fontSize: 20, fontWeight: 800, display: 'flex', gap: 12, marginTop: 4 }}>
            <span style={{ color: 'var(--blue)' }}>{rawCount}<span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 3 }}>R</span></span>
            <span style={{ color: 'var(--amber)' }}>{packCount}<span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 3 }}>P</span></span>
            <span style={{ color: 'var(--muted)' }}>{othersCount}<span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 3 }}>O</span></span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>Raw / Packing / Other items</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Unique Warehouses</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)' }}>{uniqueWarehouses}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Purchasing & Production Warehouses</div>
        </div>
      </div>

      {/* Filters & Search Panel */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxShadow: 'var(--shadow)'
      }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14 }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by code, description, or warehouse..."
              style={{
                width: '100%',
                height: 38,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0 12px 0 34px',
                background: 'var(--soft)',
                color: 'var(--text)',
                outline: 'none',
                fontFamily: 'var(--font)',
                fontSize: 13,
                transition: 'border-color .15s'
              }}
            />
          </div>

          {/* Category Filter Toggle Buttons */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: 38 }}>
            {[
              { id: 'ALL', label: 'All', count: items.length },
              { id: 'R', label: 'Raw Material (R)', count: items.filter(item => (item.ItemType || '').toUpperCase() === 'R').length },
              { id: 'P', label: 'Packing (P)', count: items.filter(item => (item.ItemType || '').toUpperCase() === 'P').length },
              { id: 'OTHERS', label: 'Others', count: items.filter(item => (item.ItemType || '').toUpperCase() !== 'R' && (item.ItemType || '').toUpperCase() !== 'P').length }
            ].map(btn => {
              const active = activeType === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => setActiveType(btn.id)}
                  style={{
                    padding: '0 16px',
                    border: 'none',
                    background: active ? 'var(--orange-soft)' : 'var(--surface)',
                    color: active ? 'var(--orange2)' : 'var(--text)',
                    fontSize: 12,
                    fontWeight: active ? 700 : 600,
                    cursor: 'pointer',
                    transition: 'all .15s',
                    borderRight: btn.id !== 'OTHERS' ? '1px solid var(--border)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>{btn.label}</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: active ? 'var(--orange)' : 'var(--soft)',
                    color: active ? '#fff' : 'var(--muted)'
                  }}>
                    {btn.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow)'
      }}>
        {loading ? (
          <div className="loading-wrap">
            <div className="spinner"></div>
            <div>Loading Safety Stock Master items...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)', fontSize: 13 }}>
            No safety stock items match the current search or filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--soft)', borderBottom: '1px solid var(--border)' }}>
                  {[
                    { key: 'ItemCode', label: 'Item Code' },
                    { key: 'ItemType', label: 'Item Type' },
                    { key: 'ItemDescription', label: 'Item Description' },
                    { key: 'SaftyStock', label: 'Safety Stock Qty' },
                    { key: 'PurchasingWarehouse', label: 'Purchasing WH' },
                    { key: 'ProducationWarehouse', label: 'Production WH' },
                    { key: 'LastMaintBy', label: 'Last Maintained By' },
                    { key: 'LastMaintDate', label: 'Last Maint Date' },
                  ].map((col) => {
                    const isSorted = sortField === col.key;
                    const isNumeric = col.key === 'SaftyStock';
                    return (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        style={{
                          padding: '12px 18px',
                          color: isSorted ? 'var(--text)' : 'var(--muted)',
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '.05em',
                          textAlign: isNumeric ? 'right' : 'left',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'color .15s'
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, width: '100%', justifyContent: isNumeric ? 'flex-end' : 'flex-start' }}>
                          {col.label}
                          <span style={{ 
                            fontSize: 9, 
                            color: isSorted ? 'var(--orange2)' : 'var(--muted)',
                            opacity: isSorted ? 1 : 0.4
                          }}>
                            {isSorted ? (sortAsc ? '▲' : '▼') : '↕'}
                          </span>
                        </span>
                      </th>
                    );
                  })}
                  <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center', width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item, i) => (
                  <tr key={item.ID} style={{
                    borderBottom: i < filteredItems.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background .15s'
                  }}>
                    <td style={{ padding: '12px 18px', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {item.ItemCode}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <TypeBadge type={item.ItemType} />
                    </td>
                    <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 500, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.ItemDescription}>
                      {item.ItemDescription || <span style={{ color: 'var(--hint)' }}>No Description</span>}
                    </td>
                    <td style={{ padding: '12px 18px', fontSize: 13, textAlign: 'right', fontWeight: 700, color: 'var(--orange2)', whiteSpace: 'nowrap' }}>
                      {fmtQty(item.SaftyStock)}
                    </td>
                    <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                      {item.PurchasingWarehouse || <span style={{ color: 'var(--hint)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                      {item.ProducationWarehouse || <span style={{ color: 'var(--hint)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {item.LastMaintBy || item.CreatedBy}
                    </td>
                    <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {fmtDate(item.LastMaintDate || item.CreatedDate)}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button 
                        onClick={() => openEdit(item)}
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          color: 'var(--text)',
                          padding: '4px 10px',
                          fontSize: 12,
                          cursor: 'pointer',
                          marginRight: 6,
                          fontWeight: 600,
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.target.style.borderColor = 'var(--orange)'; e.target.style.color = 'var(--orange2)'; }}
                        onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text)'; }}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => openDelete(item)}
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          color: 'var(--red)',
                          padding: '4px 10px',
                          fontSize: 12,
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.target.style.background = 'var(--red-soft)'; e.target.style.borderColor = 'rgba(220,38,38,0.2)'; }}
                        onMouseLeave={e => { e.target.style.background = 'none'; e.target.style.borderColor = 'var(--border)'; }}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ADD/EDIT MODAL ── */}
      {showFormModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            width: '100%',
            maxWidth: '500px',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>
                {formType === 'ADD' ? '➕ Add Safety Stock Item' : '✏️ Edit Safety Stock Item'}
              </h3>
              <button 
                onClick={() => setShowFormModal(false)}
                style={{ background: 'none', border: 'none', font: 'inherit', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {modalError && <div className="err-box">{modalError}</div>}

              {/* Item Selection (Autocomplete for Add, Read-Only for Edit) */}
              <div className="field" ref={autocompleteRef} style={{ position: 'relative', marginBottom: 0 }}>
                <label>Item</label>
                {formType === 'EDIT' ? (
                  <input 
                    type="text" 
                    value={editItem.ItemCode} 
                    disabled 
                    style={{ background: 'var(--soft)', color: 'var(--muted)', cursor: 'not-allowed' }}
                  />
                ) : (
                  <>
                    <input 
                      type="text" 
                      placeholder="Type Item Code or Name to search..." 
                      value={itemSearchText}
                      onChange={e => {
                        setItemSearchText(e.target.value);
                        setShowResultsDropdown(true);
                      }}
                      onFocus={() => setShowResultsDropdown(true)}
                    />
                    
                    {/* Autocomplete Dropdown */}
                    {showResultsDropdown && (itemSearchLoading || itemSearchResults.length > 0) && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: 'var(--shadow-lg)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 1100,
                        marginTop: 4
                      }}>
                        {itemSearchLoading && (
                          <div style={{ padding: '12px', color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>
                            Searching...
                          </div>
                        )}
                        {itemSearchResults.map(res => (
                          <div 
                            key={res.ItemID}
                            onClick={() => selectItem(res)}
                            style={{
                              padding: '10px 14px',
                              fontSize: 12.5,
                              cursor: 'pointer',
                              borderBottom: '1.5px solid var(--border2)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--soft)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                              <span style={{ color: 'var(--text)' }}>{res.ItemCode}</span>
                              <span style={{ color: 'var(--orange2)', fontSize: 10 }}>Type: {res.ItemType || '—'}</span>
                            </div>
                            <div style={{ color: 'var(--muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {res.ItemExtraDescription || 'No description available'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Item Type */}
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Item Type</label>
                <input 
                  type="text" 
                  placeholder="e.g. R, P" 
                  value={editItem.ItemType}
                  onChange={e => setEditItem(prev => ({ ...prev, ItemType: e.target.value }))}
                />
              </div>

              {/* Safety Stock (Qty) */}
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Safety Stock Quantity</label>
                <input 
                  type="number" 
                  step="any"
                  min="0"
                  placeholder="Enter threshold quantity" 
                  value={editItem.SaftyStock}
                  onChange={e => setEditItem(prev => ({ ...prev, SaftyStock: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>

              {/* Purchasing Warehouse */}
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Purchasing Warehouse</label>
                <input 
                  type="text" 
                  placeholder="e.g. WH-PUR-01" 
                  value={editItem.PurchasingWarehouse}
                  onChange={e => setEditItem(prev => ({ ...prev, PurchasingWarehouse: e.target.value }))}
                />
              </div>

              {/* Production Warehouse */}
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Production Warehouse</label>
                <input 
                  type="text" 
                  placeholder="e.g. WH-PROD-02" 
                  value={editItem.ProducationWarehouse}
                  onChange={e => setEditItem(prev => ({ ...prev, ProducationWarehouse: e.target.value }))}
                />
              </div>

              {/* Modal Footer Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 8,
                borderTop: '1px solid var(--border)',
                paddingTop: 16
              }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowFormModal(false)}
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {showDeleteConfirm && itemToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            width: '100%',
            maxWidth: '400px',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>🗑️ Delete Safety Stock Limit</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: '1.5' }}>
                Are you sure you want to delete the safety stock record for item code <strong style={{ color: 'var(--text)' }}>{itemToDelete.ItemCode}</strong>?
              </p>
              
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 24
              }}>
                <button 
                  className="btn-secondary" 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  style={{ background: 'var(--red)', borderColor: 'var(--red)' }}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
