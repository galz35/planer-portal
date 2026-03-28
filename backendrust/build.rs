fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Configura la ruta al compilador vendored para que no exija tener 'protoc' instalado
    std::env::set_var("PROTOC", protoc_bin_vendored::protoc_bin_path().unwrap());

    tonic_build::configure()
        .build_server(true)
        .build_client(false) // No necesitamos cliente Rust, solo servidor
        .compile_protos(
            &[
                "proto/common.proto",
                "proto/auth.proto",
                "proto/planning.proto",
                "proto/proyectos.proto",
                "proto/marcaje.proto",
            ],
            &["proto/"],
        )?;
    Ok(())
}
