# Return Rescue for Online Sellers
**Universal AI-Powered E-Commerce Returns & Product Recovery Platform**

---

## 🌟 Overview
**Return Rescue** transforms e-commerce product returns into sustainable opportunities for recovery, reuse, and secondary market value. Featuring computer-vision-assisted product condition analysis, category-aware decision engines, and role-based workflows for both online shoppers and operations managers.

---

## 🚀 Key Features

### 1. Dual-Portal Architecture on a Single Port
- **Unified 3D Login Page**: Interactive 3D logistics scene with a rotating parcel, laser scanning line, holographic rings, and 4 destination nodes (*Restock*, *Resale*, *Repair*, *Recycle*).
- **Tab-Isolated Authentication**: Customer and Manager sessions run concurrently in separate browser tabs without session overlap.
- **Dedicated Portals**:
  - **Customer Portal**: `/customer/dashboard`, submit return wizard, evidence upload, real-time status tracking.
  - **Manager Portal**: `/manager/dashboard`, Return Request Queue, 4-step inspection workspace, inventory adjustments.

### 2. Operational Control & Flexibility
- **Default Operations Manager**: `Jothimani` (`manager` / `Manager@123`).
- **Profile Name Customizer**: Both Customers and Managers can manually update their display name and profile details directly from the Topbar or Sidebar settings modal.
- **Return Queue Record Management**: Operations managers can permanently delete invalid or test return records directly from the Return Queue or Inspection Workspace with full audit logging.

### 3. AI-Powered 4-Channel Recovery Routing
1. **Restock**: Grade A products returned directly to prime inventory.
2. **Resale**: Open-box or cosmetic blemish items routed to secondary markets.
3. **Repair**: Restorable goods routed to technical refurb bays.
4. **Recycle**: Non-restorable or hazardous items transferred to certified green recyclers.

---

## 🛠️ Tech Stack
- **Backend**: Python 3.12, Django 6.1, Django REST Framework, SQLite / PostgreSQL, Token Authentication.
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Framer Motion.
- **Architecture**: Single externally accessible port serving both API endpoints and the compiled React SPA.

---

## 💻 Running the Application

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Quick Start (Single Port: 8000)
```bash
# 1. Install frontend dependencies and build
cd frontend
npm install
npm run build
cd ..

# 2. Install backend dependencies and migrate
cd backend
pip install -r requirements.txt
python manage.py migrate
python seed_data.py
cd ..

# 3. Launch single-port application
python run_single_port.py --port 8000
```

### Access URLs
- **Web Application / 3D Login**: [http://127.0.0.1:8000/login](http://127.0.0.1:8000/login)
- **Customer Portal**: [http://127.0.0.1:8000/customer/dashboard](http://127.0.0.1:8000/customer/dashboard)
- **Manager Portal**: [http://127.0.0.1:8000/manager/dashboard](http://127.0.0.1:8000/manager/dashboard)
- **REST API Root**: [http://127.0.0.1:8000/api/](http://127.0.0.1:8000/api/)

### Demo Accounts
- **Manager**: `manager` / `Manager@123` (Default Name: *Jothimani*)
- **Customer**: `customer` / `Customer@123`
- **Admin**: `admin` / `Admin@123`
>>>>>>> abc83ea (feat: complete return rescue platform with dual-portal single-port architecture, 3D login, profile settings, and return queue management)
