import { useState } from "react";
import { X, Minus, Plus, Save, AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";

const EditOrderModal = ({ order, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        customerName: order.customerName || "",
        customerPhone: order.customerPhone || "",
        notes: order.notes || "",
        priority: order.priority || "normal",
        items: order.items ? order.items.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes || "",
        })) : [],
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleItemChange = (index, field, value) => {
        setFormData(prev => {
            const newItems = [...prev.items];
            newItems[index] = { ...newItems[index], [field]: value };
            return { ...prev, items: newItems };
        });
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { id: `new-${Date.now()}`, name: "", quantity: 1, price: 0, notes: "" }],
        }));
    };

    const removeItem = (index) => {
        if (formData.items.length > 1) {
            setFormData(prev => ({
                ...prev,
                items: prev.items.filter((_, i) => i !== index),
            }));
        }
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate items
        if (formData.items.some(item => !item.name.trim())) {
            toast.error("All items must have a name");
            return;
        }

        setIsSaving(true);
        try {
            const updatedOrder = {
                ...order,
                customerName: formData.customerName,
                customerPhone: formData.customerPhone,
                notes: formData.notes,
                priority: formData.priority,
                items: formData.items,
                totalPrice: calculateTotal(),
            };

            if (onSave) {
                await onSave(updatedOrder);
            }
            toast.success("Order updated successfully");
            onClose();
        } catch (error) {
            toast.error("Failed to update order: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Styles
    const overlayStyle = {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
    };

    const modalStyle = {
        backgroundColor: "var(--card-bg)",
        borderRadius: "24px",
        padding: "32px",
        width: "90%",
        maxWidth: "560px",
        maxHeight: "90vh",
        overflowY: "auto",
    };

    const headerStyle = {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "24px",
    };

    const titleStyle = {
        fontSize: "24px",
        fontWeight: "800",
        color: "var(--text-primary)",
        margin: 0,
    };

    const subtitleStyle = {
        fontSize: "14px",
        color: "var(--text-tertiary)",
        marginTop: "4px",
    };

    const closeButtonStyle = {
        background: "var(--bg-tertiary)",
        border: "none",
        cursor: "pointer",
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    };

    const labelStyle = {
        display: "block",
        fontSize: "12px",
        fontWeight: "700",
        color: "var(--text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        marginBottom: "8px",
    };

    const inputStyle = {
        width: "100%",
        padding: "12px 16px",
        borderRadius: "12px",
        border: "1px solid var(--border-color)",
        backgroundColor: "var(--input-bg)",
        fontSize: "15px",
        color: "var(--text-primary)",
        outline: "none",
    };

    const sectionStyle = {
        marginBottom: "24px",
    };

    const itemCardStyle = {
        backgroundColor: "var(--bg-tertiary)",
        borderRadius: "16px",
        padding: "16px",
        marginBottom: "12px",
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={headerStyle}>
                    <div>
                        <h2 style={titleStyle}>Edit Order #{order.orderNumber || order.id?.slice?.(-5)?.toUpperCase()}</h2>
                        <p style={subtitleStyle}>{order.table}</p>
                    </div>
                    <button onClick={onClose} style={closeButtonStyle}>
                        <X size={20} color="var(--text-secondary)" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Customer Name */}
                    <div style={sectionStyle}>
                        <label style={labelStyle}>Customer Name</label>
                        <input
                            type="text"
                            name="customerName"
                            value={formData.customerName}
                            onChange={handleInputChange}
                            placeholder="Customer name"
                            style={inputStyle}
                        />
                    </div>

                    {/* Customer Phone */}
                    <div style={sectionStyle}>
                        <label style={labelStyle}>Phone Number (optional)</label>
                        <input
                            type="tel"
                            name="customerPhone"
                            value={formData.customerPhone}
                            onChange={handleInputChange}
                            placeholder="+1 (555) 000-0000"
                            style={inputStyle}
                        />
                    </div>

                    {/* Priority */}
                    <div style={sectionStyle}>
                        <label style={labelStyle}>Priority</label>
                        <div style={{ display: "flex", gap: "12px" }}>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, priority: "normal" })}
                                style={{
                                    flex: 1,
                                    padding: "12px",
                                    borderRadius: "12px",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: "600",
                                    backgroundColor: formData.priority === "normal" ? "var(--color-primary)" : "var(--bg-tertiary)",
                                    color: formData.priority === "normal" ? "white" : "var(--text-secondary)",
                                }}
                            >
                                Normal
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, priority: "high" })}
                                style={{
                                    flex: 1,
                                    padding: "12px",
                                    borderRadius: "12px",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: "600",
                                    backgroundColor: formData.priority === "high" ? "#DC2626" : "var(--bg-tertiary)",
                                    color: formData.priority === "high" ? "white" : "var(--text-secondary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                }}
                            >
                                <AlertTriangle size={16} />
                                High Priority
                            </button>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div style={sectionStyle}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                            <label style={{ ...labelStyle, marginBottom: 0 }}>Order Items</label>
                            <span style={{
                                backgroundColor: "var(--color-accent-light)",
                                color: "var(--color-primary)",
                                padding: "4px 12px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: "700",
                            }}>{formData.items.length} items</span>
                        </div>

                        {formData.items.map((item, index) => (
                            <div key={item.id || index} style={itemCardStyle}>
                                <input
                                    type="text"
                                    placeholder="Item name"
                                    value={item.name}
                                    onChange={(e) => handleItemChange(index, "name", e.target.value)}
                                    required
                                    style={{
                                        ...inputStyle,
                                        marginBottom: "8px",
                                        fontWeight: "600",
                                    }}
                                />
                                <input
                                    type="text"
                                    placeholder="Special notes"
                                    value={item.notes}
                                    onChange={(e) => handleItemChange(index, "notes", e.target.value)}
                                    style={{
                                        ...inputStyle,
                                        marginBottom: "12px",
                                        fontSize: "13px",
                                    }}
                                />
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <button
                                            type="button"
                                            onClick={() => handleItemChange(index, "quantity", Math.max(1, item.quantity - 1))}
                                            style={{
                                                width: "32px",
                                                height: "32px",
                                                borderRadius: "50%",
                                                border: "1px solid var(--border-color)",
                                                background: "var(--card-bg)",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <Minus size={14} color="var(--text-secondary)" />
                                        </button>
                                        <span style={{ fontSize: "16px", fontWeight: "600", minWidth: "20px", textAlign: "center" }}>
                                            {item.quantity}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleItemChange(index, "quantity", item.quantity + 1)}
                                            style={{
                                                width: "32px",
                                                height: "32px",
                                                borderRadius: "50%",
                                                border: "1px solid var(--border-color)",
                                                background: "var(--card-bg)",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <Plus size={14} color="var(--text-secondary)" />
                                        </button>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>$</span>
                                        <input
                                            type="number"
                                            value={item.price}
                                            step="0.01"
                                            min="0"
                                            onChange={(e) => handleItemChange(index, "price", parseFloat(e.target.value) || 0)}
                                            style={{
                                                width: "80px",
                                                padding: "8px",
                                                borderRadius: "8px",
                                                border: "1px solid var(--border-color)",
                                                fontSize: "16px",
                                                fontWeight: "700",
                                                textAlign: "right",
                                                backgroundColor: "var(--input-bg)",
                                                color: "var(--text-primary)",
                                            }}
                                        />
                                        {formData.items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                style={{
                                                    width: "28px",
                                                    height: "28px",
                                                    borderRadius: "50%",
                                                    border: "none",
                                                    background: "#FEE2E2",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                <X size={14} color="#DC2626" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addItem}
                            style={{
                                width: "100%",
                                padding: "12px",
                                backgroundColor: "transparent",
                                color: "var(--color-primary)",
                                border: "2px dashed var(--color-accent-light)",
                                borderRadius: "12px",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "14px",
                            }}
                        >
                            + Add Another Item
                        </button>
                    </div>

                    {/* Total */}
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "16px",
                        backgroundColor: "var(--bg-tertiary)",
                        borderRadius: "12px",
                        marginBottom: "24px",
                    }}>
                        <span style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-secondary)" }}>Total</span>
                        <span style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)" }}>
                            Rs. {calculateTotal().toFixed(2)}
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: "12px" }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: "14px",
                                backgroundColor: "var(--bg-tertiary)",
                                color: "var(--text-secondary)",
                                border: "none",
                                borderRadius: "12px",
                                cursor: "pointer",
                                fontSize: "15px",
                                fontWeight: "600",
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            style={{
                                flex: 2,
                                padding: "14px",
                                backgroundColor: isSaving ? "var(--text-tertiary)" : "var(--color-primary)",
                                color: "white",
                                border: "none",
                                borderRadius: "12px",
                                cursor: isSaving ? "not-allowed" : "pointer",
                                fontSize: "15px",
                                fontWeight: "700",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                            }}
                        >
                            <Save size={18} />
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditOrderModal;
