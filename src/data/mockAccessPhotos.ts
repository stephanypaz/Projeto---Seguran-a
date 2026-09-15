import { AccessPhotoRecord } from '../types';
import { generateSimulatedEntranceSnapshot } from '../utils/camera';
import { generateSHA256Hash } from '../utils/security';

export function getInitialAccessPhotos(): AccessPhotoRecord[] {
  // Check if there are already persisted photos in localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('hospital_access_photos');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fall through to initial demo records
    }
  }

  // Pre-seed a couple of realistic previous access records
  const photo1 = generateSimulatedEntranceSnapshot(
    {
      userName: 'Dr. Mateus Felix',
      userRoleTitle: 'Médico Cardiologista & Intensivista',
      registrationNumber: 'CRM/SP 142.890',
      timestamp: '11/09/2026 10:14:22',
      deviceType: 'Notebook',
      hashProof: generateSHA256Hash('seed_doc_1_access'),
    },
    'UNAVAILABLE'
  );

  const photo2 = generateSimulatedEntranceSnapshot(
    {
      userName: 'Enf. Anna Karol',
      userRoleTitle: 'Enfermeira Especialista em UTI',
      registrationNumber: 'COREN/SP 341.220-ENF',
      timestamp: '11/09/2026 07:02:18',
      deviceType: 'Tablet',
      hashProof: generateSHA256Hash('seed_nurse_1_access'),
    },
    'UNAVAILABLE'
  );

  return [
    {
      id: 'photo_seed_1',
      timestamp: '11/09/2026 10:14:22',
      userId: 'usr_doc_01',
      userName: 'Dr. Mateus Felix',
      userRole: 'DOCTOR',
      userRoleTitle: 'Médico Cardiologista & Intensivista',
      registrationNumber: 'CRM/SP 142.890',
      photoDataUrl: photo1,
      deviceType: 'Notebook',
      status: 'CAPTURED_SUCCESS',
      hashProof: generateSHA256Hash('seed_doc_1_access'),
      ipAddress: '10.240.12.84',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Hospital Terminal #04',
    },
    {
      id: 'photo_seed_2',
      timestamp: '11/09/2026 07:02:18',
      userId: 'usr_nurse_01',
      userName: 'Enf. Anna Karol',
      userRole: 'NURSE',
      userRoleTitle: 'Enfermeira Especialista em UTI',
      registrationNumber: 'COREN/SP 341.220-ENF',
      photoDataUrl: photo2,
      deviceType: 'Tablet',
      status: 'CAPTURED_SUCCESS',
      hashProof: generateSHA256Hash('seed_nurse_1_access'),
      ipAddress: '10.240.12.92',
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_4) Hospital Mobile Station',
    },
  ];
}
