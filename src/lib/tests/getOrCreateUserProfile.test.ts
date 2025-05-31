// Pruebas para la función getOrCreateUserProfile

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrCreateUserProfile } from '../getOrCreateUserProfile';

// Cliente Supabase simulado utilizado en el módulo bajo prueba
const supabaseMock = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock('../supabase', () => ({ supabase: supabaseMock }));

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * - Verifica que se devuelva un perfil existente si ya está en la base.
 * - Verifica que se cree un nuevo perfil si no existe uno.
 * - Usa mocks de Supabase para simular comportamiento de la base de datos.
 */
describe('getOrCreateUserProfile', () => {
  // Verifica que se devuelva un perfil existente si ya está en la base.
  it('returns the existing profile', async () => {
    const user = { id: '123' };
    const profile = { id: '123', nombre: 'Existing' };

    supabaseMock.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    supabaseMock.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: profile, error: null }),
    });

    const result = await getOrCreateUserProfile();
    expect(result).toEqual(profile);
    expect(supabaseMock.from).toHaveBeenCalledWith('profiles');
  });

  // Verifica que se cree un nuevo perfil cuando no existe previamente.
  it('inserts a profile when none exists', async () => {
    const user = { id: '321' };
    const newProfile = { id: '321', nombre: 'Nombre por defecto' };

    supabaseMock.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    // Primer llamado: intento de obtener perfil que no existe
    supabaseMock.from.mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }));

    // Segundo llamado: inserta un nuevo perfil
    const insertSelectMock = vi.fn().mockReturnThis();
    const insertSingleMock = vi.fn().mockResolvedValue({ data: newProfile, error: null });
    const insertMock = vi.fn(() => ({ select: insertSelectMock, single: insertSingleMock }));

    supabaseMock.from.mockImplementationOnce(() => ({ insert: insertMock }));

    const result = await getOrCreateUserProfile();
    expect(result).toEqual(newProfile);
    expect(insertMock).toHaveBeenCalledWith([{ id: user.id, nombre: 'Nombre por defecto' }]);
    expect(supabaseMock.from).toHaveBeenCalledTimes(2);
  });
});
