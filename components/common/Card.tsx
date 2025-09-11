
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  const cardClasses = `bg-white p-6 rounded-xl shadow-md border border-gray-200 ${className}`;
  return <div className={cardClasses}>{children}</div>;
};

export default Card;
