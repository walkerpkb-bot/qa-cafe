/**
 * SQLite storage layer for QA Cafe
 * Handles projects, sessions, findings, etc.
 */

// Placeholder - will implement with better-sqlite3

export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
  lastOpened: Date;
}

export interface Session {
  id: string;
  projectId: string;
  startedAt: Date;
  endedAt?: Date;
  notes: string[];
}

export interface Finding {
  id: string;
  sessionId: string;
  type: 'bug' | 'observation' | 'risk' | 'gap';
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
}

// TODO: Implement actual SQLite operations
export function initDatabase(): void {
  console.log('Database initialized (placeholder)');
}

export function getProjects(): Project[] {
  return [];
}

export function saveProject(project: Omit<Project, 'id'>): Project {
  return { id: crypto.randomUUID(), ...project };
}
