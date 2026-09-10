'use client';

import React from 'react';
import { OfficialWorkshopAgenda } from './OfficialWorkshopAgenda';

export function OfficialGeneticsWorkshopAgenda(props: { onPrint?: () => void; lang?: string }) {
  return <OfficialWorkshopAgenda {...props} />;
}
