import { FaBed, FaChartBar, FaCog, FaDatabase, FaFileInvoiceDollar, FaMoneyBill, FaTachometerAlt, FaUserFriends, FaUserPlus } from 'react-icons/fa';
import styles from './sidebar.module.css';
import {InteractiveUserDropdown, SidebarItem} from "@/app/_components/sidebar/SidebarItem";
import {auth, signIn} from "@/app/_lib/auth";

export default async function Sidebar() {
    const menuItems = [
        { name: 'Dashboard', path: '/dashboard', icon: <FaTachometerAlt /> },
        {
            name: 'Data Center',
            path: '/data-center',
            icon: <FaDatabase />,
            children: [
                { name: 'Administrators', path: '/data-center/administrators' },
                { name: 'Normal Users', path: '/data-center/normal-users' },
                { name: 'Property Locations', path: '/data-center/property-locations' },
                { name: 'Email Settings', path: '/data-center/email-settings' },
                { name: 'Rooms', path: '/data-center/rooms' },
                { name: 'Penalties', path: '/data-center/penalties' },
                { name: 'Rules', path: '/data-center/rules' },
                { name: 'Fees', path: '/data-center/fees' },
                { name: 'Expenses', path: '/data-center/expenses' },
            ]
        },
        { name: 'Registrations', path: '/registration', icon: <FaUserPlus /> },
        { name: 'Bookings', path: '/bookings', icon: <FaBed /> },
        { name: 'Payments', path: '/payments', icon: <FaMoneyBill /> },
        { name: 'Incomes', path: '/incomes', icon: <FaFileInvoiceDollar /> },
        { name: 'Expenses', path: '/expenses', icon: <FaFileInvoiceDollar /> },
        { name: 'Reports', path: '/reports', icon: <FaChartBar /> },
        { name: 'Guests', path: '/guests', icon: <FaUserFriends /> },
        { name: 'Settings', path: '/settings', icon: <FaCog /> },
    ];
    const session = await auth();

    if (!session?.user) return signIn(undefined, {redirectTo: "/"});

    return (
      <div className={`${styles.sidebar}`}>
          <div className={styles.sidebarContent}>
              <div className={styles.sidebarHeader}>
                  <h2>Hotel Management System</h2>
              </div>
              <ul className={styles.sidebarMenu}>
                      {menuItems.map((item, index) => (
                        <SidebarItem key={index} {...item} />
                      ))}
              </ul>
              <div className={styles.sidebarFooter}>
                  <InteractiveUserDropdown user={session.user} />
              </div>
          </div>
      </div>
    );
}

