import React, {useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import styles from "./dropdown.module.css";

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  onChange: (value: string) => void;
  value: string;
  label?: string;
  placeholder?: string;
}

export default function Dropdown(props: DropdownProps) {
  const {options, onChange, value, label, placeholder} = props;
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <div className={styles.dropdown}>
      {label && <label className={styles.dropdownLabel}>{label}</label>}
      <div className={styles.dropdownContainer}>
        <button className={styles.dropdownButton} onClick={toggleOpen}>
          {value ? options.find(option => option.value === value)?.label : placeholder || 'Select...'}
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.ul
              className={styles.dropdownList}
              initial={{opacity: 0, height: 0}}
              animate={{opacity: 1, height: 'auto'}}
              exit={{opacity: 0, height: 0}}
              transition={{duration: 0.2}}
            >
              {options.map(option => (
                <li
                  key={option.value}
                  className={styles.dropdownItem}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
