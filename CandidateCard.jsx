import React from "react";

export default function CandidateCard({ candidate, selected, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer border rounded-lg p-4 flex items-center space-x-4 transition-shadow ${
        selected ? "border-green-600 shadow-lg" : "hover:shadow-md"
      }`}
    >
      {candidate.photo && (
        <img
          src={candidate.photo}
          alt={candidate.name}
          className="w-12 h-12 rounded-full"
        />
      )}
      <div>
        <p className="font-semibold">{candidate.name}</p>
        <p className="text-gray-500 text-sm">{candidate.manifesto}</p>
      </div>
    </div>
  );
}
