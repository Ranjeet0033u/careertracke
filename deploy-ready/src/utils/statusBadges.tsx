import React from 'react';
import { ApplicationStatus, InterviewResult, OfferStatus } from '../types';

export const getStatusBadge = (status: ApplicationStatus) => {
  switch (status) {
    case 'Applied':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF3FC] text-[#1D4ED8] border border-[#BFDBFE]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8]" />
          Applied
        </span>
      );
    case 'Shortlisted':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F2EEFF] text-[#6D28D9] border border-[#DDD6FE]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6D28D9]" />
          Shortlisted
        </span>
      );
    case 'Interview Scheduled':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF7E6] text-[#B45309] border border-[#FDE68A]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]" />
          Interview Scheduled
        </span>
      );
    case 'Offered':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF8F0] text-[#15803D] border border-[#BBF7D0]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
          Offered
        </span>
      );
    case 'Rejected':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF0F3] text-[#BE123C] border border-[#FECDD3]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#BE123C]" />
          Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          {status}
        </span>
      );
  }
};

export const getInterviewResultBadge = (result: InterviewResult) => {
  switch (result) {
    case 'Cleared':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF8F0] text-[#15803D] border border-[#BBF7D0]">
          Cleared
        </span>
      );
    case 'Pending':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF3FC] text-[#1D4ED8] border border-[#BFDBFE]">
          Pending
        </span>
      );
    case 'Rejected':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF0F3] text-[#BE123C] border border-[#FECDD3]">
          Rejected
        </span>
      );
  }
};

export const getOfferStatusBadge = (status: OfferStatus) => {
  switch (status) {
    case 'Accepted':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF8F0] text-[#15803D] border border-[#BBF7D0]">
          Accepted
        </span>
      );
    case 'Pending':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF7E6] text-[#B45309] border border-[#FDE68A]">
          Decision Pending
        </span>
      );
    case 'Rejected':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF0F3] text-[#BE123C] border border-[#FECDD3]">
          Declined
        </span>
      );
  }
};
