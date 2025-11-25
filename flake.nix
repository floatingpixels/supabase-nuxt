{
  description =
    "Development environment for Nuxt with Node, TypeScript, pnpm, Postgres and Supabase";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        # Generate zsh completions for supabase
        supabase-completions = pkgs.runCommand "supabase-zsh-completions" { } ''
          mkdir -p $out/share/zsh/site-functions
          ${pkgs.supabase-cli}/bin/supabase completion zsh \
            > $out/share/zsh/site-functions/_supabase
        '';
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_24
            typescript
            sqlfluff
            pnpm
            supabase-cli
            supabase-completions
            nodePackages."@antfu/ni"
            postgresql_17
          ];
          shellHook = ''
            # Add supabase binary to PATH if installed locally  via pnpm
            # ensures local project version is used over nix version
            if [ -d "./node_modules/supabase/bin" ]; then
              export PATH=$PWD/node_modules/supabase/bin''${PATH:+:$PATH}
            fi

            # Put completions in path for zsh-completion-sync plugin
            # which watches XDG_DATA_DIRS for new completions and loads them
            export XDG_DATA_DIRS=${supabase-completions}/share''${XDG_DATA_DIRS:+:$XDG_DATA_DIRS}
          '';
        };
      });
}
