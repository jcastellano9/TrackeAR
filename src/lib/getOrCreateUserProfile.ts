
/**
 * Obtiene el perfil del usuario autenticado desde Supabase o lo crea si no existe.
 * - Si el perfil ya está registrado, lo retorna directamente.
 * - Si no existe, crea un nuevo perfil con valores por defecto.
 * - Lanza errores en caso de fallo en la autenticación o consultas.
 */
import { supabase } from './supabase'; // Cliente configurado de Supabase
export async function getOrCreateUserProfile() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw userError ?? new Error("No user authenticated");

    const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    // Si hubo un error y no es porque no hay filas (es decir, no existe el perfil), lo lanzamos
    if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
    }

    if (!profile) {
        const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert([{ id: user.id, nombre: "Nombre por defecto" }])
            .select()
            .single();

        if (insertError) throw insertError;
        return newProfile;
    }

    return profile;
}
