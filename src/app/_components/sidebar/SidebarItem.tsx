"use client";

import styles from "@/app/_components/sidebar/sidebar.module.css";
import Link from "next/link";
import {FaChevronDown} from "react-icons/fa";
import {motion} from "framer-motion";
import {SiteUser} from "@prisma/client";
import {CiLogout} from "react-icons/ci";
import React, {useRef, useState} from "react";
import {signOut} from "next-auth/react";
import {useChangelogContext} from "../ChangelogProvider";

interface SidebarItemProps {
    name: string;
    path: string;
    icon: React.ReactNode;
    children?: Array<{ name: string; path: string }>;
    onItemClick?: () => void;
}

export function SidebarItem({name, path, icon, children, onItemClick}: SidebarItemProps) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const handleClick = (e: React.MouseEvent) => {
        if (children) {
            e.preventDefault();
            toggleDropdown();
        } else {
            onItemClick?.();
        }
    };

    return (
        <li className={`${styles.menuItem}`}>
            <div className={`group/itemHeader ${styles.itemHeader}`}>
                <Link
                    onClick={handleClick}
                    href={path}
                    className={`${styles.item} group-hover/itemHeader:text-white`}
                >
                    <span className={styles.icon}>{icon}</span>
                    <span className={styles.text}>{name}</span>
                </Link>
                {children && (
                    <span className={`${styles.dropdownIcon} ${isOpen ? styles.open : ''}`} onClick={toggleDropdown}>
                        <FaChevronDown/>
                    </span>
                )}
            </div>
            {children && (
                <motion.ul initial={{height: 0}} animate={isOpen ? {height: 'auto'} : undefined}
                           className={styles.dropdownMenu}>
                    {children.map((child, index) => (
                        <li key={index} className={`group/childMenuItem ${styles.menuItem}`}>
                            <Link href={child.path} className={`${styles.item} group-hover/childMenuItem:text-white`} onClick={onItemClick}>
                                <span className={styles.text}>{child.name}</span>
                            </Link>
                        </li>
                    ))}
                </motion.ul>
            )}
        </li>
    );
}

export function InteractiveUserDropdown({user}: { user: SiteUser }) {
    "use client";
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const userAvatarRef = useRef<HTMLDivElement>(null);
    const { showChangelogManually } = useChangelogContext();


    const getUserNameInitials = (name: string) => {
        if (!name) return "";

        const parts = name.trim().split(/\s+/);
        const initials = parts.slice(0, 2).map(part => part.charAt(0).toUpperCase());

        return initials.join("");
    };

    const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
        if (!event.relatedTarget || !dropdownRef.current?.contains(event.relatedTarget as Node)) {
            if (event.relatedTarget !== userAvatarRef.current) {
                setIsUserDropdownOpen(false);
            }
        }
    };

    const toggleUserDropdown = () => {
        setIsUserDropdownOpen((prevState) => {
            if (!prevState) {
                dropdownRef.current?.focus();
            }
            return !prevState;
        });
    };

    const handleWhatsNewClick = () => {
        setIsUserDropdownOpen(false);
        showChangelogManually();
    };

    return (
        <>
            <div
                className={`group/footerUser ${styles.footerUser}`}
                onClick={toggleUserDropdown}
                ref={userAvatarRef}
                tabIndex={0}
            >
                <div className={`${styles.userAvatar} group-hover/footerUser:border-opacity-100`}>
                    <span>{getUserNameInitials(user.name)}</span>
                </div>
                <FaChevronDown className={`${styles.userDropdownIcon} group-hover/footerUser:opacity-100`}/>
            </div>
            <motion.div
                initial={{scale: 0, transformOrigin: 'left bottom'}}
                animate={isUserDropdownOpen ? {scale: 1} : undefined}
                className={styles.footerUserDropdown}
                ref={dropdownRef}
                tabIndex={-1}
                onBlur={handleBlur}
            >
                <div className={styles.userInfo}>
                    <span>{user?.name}</span>
                    <span>{user?.email}</span>
                </div>
                <ul className={styles.dropdownList}>
                    <li>
                        <button onClick={handleWhatsNewClick} className="w-full text-left">
                            Apa yang baru?
                        </button>
                    </li>
                    <li>
                        <Link href="/profile">Profil anda</Link>
                    </li>
                    <li>
                        <Link href="/help-center">Pusat Bantuan</Link>
                    </li>
                    <li>
                        <Link href="/resources-guides">Sumber Daya & Panduan</Link>
                    </li>
                    <li>
                        <Link href="/sign-out">Keluar</Link>
                    </li>
                </ul>
            </motion.div>
            <div className={styles.footerOptions}>
                <div title="Logout" className={styles.logoutBtn} onClick={() => signOut({callbackUrl: "/login"})}>
                    <CiLogout/>
                </div>
            </div>
        </>
    );
}
