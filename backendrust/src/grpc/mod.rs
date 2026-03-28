pub mod auth_grpc;
pub mod planning_grpc;

// Re-export generated proto types
pub mod pb {
    pub mod common {
        tonic::include_proto!("common");
    }
    pub mod auth {
        tonic::include_proto!("auth");
    }
    pub mod planning {
        tonic::include_proto!("planning");
    }
    pub mod proyectos {
        tonic::include_proto!("proyectos");
    }
    pub mod marcaje {
        tonic::include_proto!("marcaje");
    }
}
