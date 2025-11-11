{
  description =
    "Development environment for Nuxt.js project with Node.js and TypeScript";

  inputs = {
    # nixpkgs.url = "nixpkgs/nixos-24.05";
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        # pkgs = import nixpkgs { inherit system; };
      in {
        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_24 # Node.js
            pnpm
            nodePackages."@antfu/ni"
            postgresql_15
          ];
          shellHook = ''
            if [ -d "./node_modules/supabase/bin" ]; then
              PATH_add $PWD/node_modules/supabase/bin
            fi
          '';
        };
      });
}
