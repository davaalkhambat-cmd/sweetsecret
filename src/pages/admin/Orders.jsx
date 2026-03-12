import React, { useState } from 'react';
import { Search, Eye, Download, Filter } from 'lucide-react';

const Orders = () => {
    const [orders] = useState([
        { id: 'ORD-001', customer: 'Бат-Эрдэнэ', date: '2024-03-20', total: 125000, status: 'Completed' },
        { id: 'ORD-002', customer: 'Сараа', date: '2024-03-21', total: 45000, status: 'Pending' },
        { id: 'ORD-003', customer: 'Болд', date: '2024-03-21', total: 68000, status: 'Processing' },
        { id: 'ORD-004', customer: 'Ану', date: '2024-03-22', total: 32000, status: 'Shipped' },
    ]);

    const getStatusClass = (status) => {
        switch (status) {
            case 'Completed': return 'status-completed';
            case 'Pending': return 'status-pending';
            case 'Processing': return 'status-processing';
            case 'Shipped': return 'status-shipped';
            default: return '';
        }
    };

    return (
        <div className="admin-page">
            <div className="page-header">
                <div className="header-info">
                    <h1>Захиалгууд</h1>
                    <p>Нийт {orders.length} захиалга ирсэн байна</p>
                </div>
                <button className="export-btn">
                    <Download size={18} />
                    <span>Тайлан татах</span>
                </button>
            </div>

            <div className="table-filters">
                <div className="search-box">
                    <Search size={18} />
                    <input type="text" placeholder="Захиалга хайх..." />
                </div>
                <button className="filter-btn">
                    <Filter size={18} />
                    <span>Шүүлтүүр</span>
                </button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Хэрэглэгч</th>
                            <th>Огноо</th>
                            <th>Нийт дүн</th>
                            <th>Төлөв</th>
                            <th>Үйлдэл</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => (
                            <tr key={order.id}>
                                <td>{order.id}</td>
                                <td>{order.customer}</td>
                                <td>{order.date}</td>
                                <td>₮{order.total.toLocaleString()}</td>
                                <td>
                                    <span className={`status-pill ${getStatusClass(order.status)}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="actions-cell">
                                    <button title="Харах" className="action-icon view"><Eye size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Orders;
