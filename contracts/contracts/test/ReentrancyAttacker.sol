// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../TokenFactory.sol";

/**
 * @title ReentrancyAttacker
 * @dev Contrato malicioso diseñado para intentar un ataque de reentrancy durante el reembolso de excedente.
 */
contract ReentrancyAttacker {
    TokenFactory public factory;
    bool public attackAttempted;

    constructor(address factoryAddress) {
        factory = TokenFactory(factoryAddress);
    }

    function attack() external payable {
        // Enviar más valor que el serviceFee para provocar un reembolso
        factory.createToken{value: msg.value}(
            "Attack Token",
            "ATK",
            18,
            1000,
            false,
            false
        );
    }

    // Al recibir el reembolso de BNB, intenta llamar reentrantemente a createToken
    receive() external payable {
        if (!attackAttempted) {
            attackAttempted = true;
            // Intento de reingreso: debe ser bloqueado por nonReentrant
            factory.createToken{value: 0.01 ether}(
                "Reentrant Token",
                "RENT",
                18,
                1000,
                false,
                false
            );
        }
    }
}
