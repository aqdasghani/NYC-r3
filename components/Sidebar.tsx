'use client';

import { 
  Home, 
  Package, 
  Archive, 
  ShoppingCart, 
  ShoppingBag, 
  Users, 
  ArrowLeftRight, 
  RotateCcw, 
  BrainCircuit, 
  FileText, 
  Leaf, 
  Bell, 
  MessageSquare, 
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Inventory', href: '/inventory', icon: Archive },
  { name: 'Sales & POS', href: '/sales', icon: ShoppingCart },
  { name: 'Purchases', href: '/purchases', icon: ShoppingBag },
  { name: 'Suppliers', href: '/suppliers', icon: Users },
  { name: 'Transfers', href: '/transfers', icon: ArrowLeftRight },
  { name: 'Returns', href: '/returns', icon: RotateCcw },
  { name: 'AI Intelligence', href: '/ai-intelligence', icon: BrainCircuit },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Sustainability', href: '/sustainability', icon: Leaf },
  { name: 'Alerts', href: '/alerts', icon: Bell, badge: 5 },
  { name: 'WhatsApp Hub', href: '/whatsapp-hub', icon: MessageSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {isOpen && <div className={styles.overlay} onClick={onClose} />}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.logoContainer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Leaf className={styles.logoIcon} size={24} />
          <div className={styles.logoText}>GREENSHOP.AI</div>
        </div>
        <div className={styles.logoSubtext}>[ SYS.READY ]</div>
        <hr className={styles.divider} />
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              href={item.href} 
              key={item.name} 
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={onClose}
            >
              <span className={styles.bracket}>{isActive ? '>' : '['}</span>
              <item.icon className={styles.icon} size={16} />
              <span className={styles.navLabel}>{item.name.toUpperCase()}</span>
              {item.badge && (
                <span className={styles.badge}>{item.badge}</span>
              )}
              <span className={styles.bracket}>{isActive ? '<' : ']'}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.bottomSection}>
        <hr className={styles.divider} />
        <div className={styles.greenScoreContainer}>
          <div className={styles.gsHeader}>
            <span>&lt;GREEN_SCORE&gt;</span>
          </div>
          
          <div className={styles.gaugeContainer}>
            <div className={styles.gaugeContent}>
              <span className={styles.gaugeValue}>84</span>
              <span className={styles.gaugeMax}>/100</span>
            </div>
          </div>
          <div className={styles.gsTrend}>[ +7 MTD ]</div>
        </div>
      </div>
    </aside>
    </>
  );
}
