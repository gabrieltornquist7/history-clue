"use client";

export default function Card({ children, className = "" }) {
  return (
    <div
      className={`backdrop-blur rounded-xl shadow-2xl ${className}`}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
      }}
    >
      {children}
    </div>
  );
}