# Credit Card Wallet - Quick Reference

## 🚀 Quick Start

### Create a Credit Card Wallet
1. Go to **Multi-Wallet**
2. Click **New Wallet**
3. Select **Credit Card** type
4. Fill in:
   - **Credit Limit**: Your card limit (e.g., 43,000)
   - **Billing Date**: Day of month (1-31)
   - **Due Date Duration**: Days to pay (default 20)
   - **Existing Debt**: Current balance (optional)

### If Between Billing & Due Date
- Answer: "Has last bill been paid?"
- If No → Enter last billed amount

---

## 📊 Understanding the Visual Breakdown

```
Credit Limit: 43,000
Available: 18,405.30

[🔴 18,603 | 🟠 6,000 | 🟢 18,405.30]
```

- 🔴 **Red (Billed)**: Amount from last statement - needs payment
- 🟠 **Orange (Unbilled)**: New spending since last bill
- 🟢 **Teal (Available)**: Remaining credit you can use

---

## 💳 Making Payments

### Partial Payment
```
Unpaid Bill: 18,603
Pay: 5,000
Result: Unpaid becomes 13,603
```

### Full Payment
```
Unpaid Bill: 18,603
Pay: 18,603
Result: 
  - Bill cleared
  - Billing cycle advances
  - New bill created from new spending
```

---

## 📈 Billing Cycle Example

### Month 1 (Billing Date: 15th)
```
Day 1-14: Building up charges
  - Billed: 18,603 (from previous month)
  - Unbilled: 6,000 (new spending)
  - Available: 18,405.30

Day 15: Billing Date
  - Statement generated
  - Due Date: Dec 5 (20 days later)

Day 16-35: Payment period
  - Can make partial or full payment
  - New spending adds to unbilled
```

### Month 2 (After Full Payment)
```
Day 1: After paying full 18,603
  - Billed: 6,000 (was unbilled)
  - Unbilled: 0 (resets)
  - Available: 37,000 (more credit available)

Day 15: Next Billing Date
  - New statement generated
  - Billed: 6,000 + new spending
```

---

## 🎯 Key Metrics

| Metric | Meaning | Color |
|--------|---------|-------|
| **Credit Limit** | Total available credit | - |
| **Credit Used** | Total outstanding balance | - |
| **Billed Amount** | Last statement (needs payment) | 🔴 Red |
| **Unbilled Amount** | New spending (will be billed) | 🟠 Orange |
| **Available Credit** | Remaining to spend | 🟢 Teal |
| **Unpaid Bill** | Remaining from last statement | 🔴 Red |
| **Due Date** | Payment deadline | 📅 |

---

## ✅ Checklist for Your Example

Your scenario:
- Credit Limit: 43,000
- Current Used: 24,594.70
- Last Billed: 18,603
- Unbilled: 6,000

**Verify you see:**
- [ ] Red bar showing 18,603 (billed)
- [ ] Orange bar showing 6,000 (unbilled)
- [ ] Teal bar showing 18,405.30 (available)
- [ ] "Last Billed: 18,603" in red text
- [ ] "Unbilled (New): 6,000" in orange text
- [ ] "Record Payment" button available
- [ ] Due date displayed with days remaining

---

## 🔄 Automatic Features

✅ **Automatic Billing Cycle**
- Advances when due date passes
- Converts unbilled to billed
- Creates new cycle

✅ **Smart Bill Questions**
- Only asks when between billing & due date
- Automatically includes unpaid bill in debt

✅ **Payment Tracking**
- Records all payments
- Updates credit balance
- Reflects in all views

---

## 💡 Tips

1. **First Time Setup**: If creating mid-cycle, answer the bill questions
2. **Partial Payments**: You can pay any amount up to unpaid bill
3. **Full Payments**: Automatically advances to next billing cycle
4. **New Spending**: Automatically tracked as unbilled
5. **Dashboard**: Shows all wallets with color breakdown

---

## 🆘 Troubleshooting

**Unbilled not showing?**
- Ensure you have expenses after last billing date
- Check that billing date is set

**Bill questions not appearing?**
- Only shows if today is between billing & due date
- Try creating wallet on a date in that range

**Payment not reflecting?**
- Check that payment was recorded as transaction
- Verify wallet updated with new amounts
- Refresh page if needed

---

## 📱 Mobile View

All features work on mobile:
- Swipe to see full breakdown
- Tap payment button to enter amount
- Color bar scales to screen size
- All text readable on small screens

