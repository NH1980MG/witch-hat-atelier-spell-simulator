# Particle And Material Physics Design

## Goal

Extend the published 3D workshop so elemental particles can collide with props and trigger persistent material consequences, including fire propagation, wetting, extinguishing, steam, scorching, and eventual charring.

## Architecture

Rapier remains responsible for rigid bodies, gravity, and object collisions. A separate deterministic particle runtime handles small interaction packets with a strict particle budget; visual Three.js particles remain decorative and never receive individual Rapier bodies.

The particle runtime uses a spatial hash to compare only nearby particles and targets. It reports accumulated heat, water, frost, and smothering effects to the existing Rapier material state machine. Burning targets become secondary heat emitters, so fire can spread after the original spell field moves away.

## Material State

Every physical target retains the existing reaction fields and adds:

- `temperatureC`: persistent temperature, initialized to ambient temperature.
- `fuel`: remaining combustible material from 0 to 1.
- `damage`: irreversible thermal damage from 0 to 1.
- `steamExposure`: recent water-on-hot-material interaction from 0 to 1.

Combustible materials are cloth, paper, plant, wax, and wood. Wetness raises the effective ignition threshold. Fire consumes fuel and increases damage. A depleted target becomes `charred`; water cools and can produce `steaming` before or while extinguishing.

## Particle Rules

- Heat packets raise temperature and heat exposure when they enter a target collider.
- Water packets increase wetness and cool the target.
- Heat and water packets meeting in one spatial cell consume each other and emit a bounded steam packet.
- Burning targets emit deterministic radial heat and smoke packets.
- Wind force descriptors bias packet velocity without adding new elemental effects.
- Crystal packets preserve the existing frost and crystallization behavior.
- Particle count is capped and oldest packets are discarded first.

## Performance

The default budget is 192 interaction particles. The simulation advances at the existing bounded physics timestep and uses no randomness, network access, worker, or new dependency. Snapshot summaries expose counts by particle kind without serializing every particle.

## Compatibility

Existing spell-volume reactions remain active, so current spells and tests keep their behavior. Restoring or resetting a target resets all new material fields. Persisted workshop snapshots accept older records that do not contain the new fields.

The Minecraft/application demo is out of scope.

## Verification

Automated tests cover particle capping, packet collision, heat-water steam conversion, secondary fire spread, water extinguishing, material depletion, and snapshot restoration. The complete Node test suite and a browser smoke test of the 3D view are required before publication.
