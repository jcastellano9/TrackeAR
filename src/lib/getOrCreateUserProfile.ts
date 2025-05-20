import { supabase } from './supabase'; // Cliente configurado de Supabase

// Obtiene el perfil del usuario autenticado o lo crea si no existe
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
