// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StandardBEP20
 * @dev Implementación configurable y segura de un Token BEP-20 para BNB Smart Chain.
 * Cumple con el estándar ERC-20 / BEP-20 utilizando las bibliotecas auditadas de OpenZeppelin.
 */
contract StandardBEP20 is ERC20, Ownable {
    uint8 private immutable _decimals;
    bool public immutable canBurn;
    bool public immutable canMint;

    event TokenCreated(
        address indexed owner,
        string name,
        string symbol,
        uint8 decimals,
        uint256 initialSupply,
        bool canBurn,
        bool canMint
    );

    event TokensBurned(address indexed burner, uint256 amount);
    event TokensMinted(address indexed to, uint256 amount);

    /**
     * @dev Constructor que inicializa el token con los parámetros elegidos por el usuario.
     * @param name_ Nombre del token (ej. "Mi Cripto Moneda")
     * @param symbol_ Símbolo o ticker (ej. "MCM")
     * @param decimals_ Posiciones decimales (18 estándar)
     * @param initialSupply_ Suministro inicial en unidades enteras (ej. 1,000,000)
     * @param initialOwner_ Billetera que recibe el suministro inicial y la propiedad del contrato
     * @param canBurn_ Bandera booleana para habilitar la quema de tokens
     * @param canMint_ Bandera booleana para permitir acuñaciones futuras por parte del propietario
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        address initialOwner_,
        bool canBurn_,
        bool canMint_
    ) ERC20(name_, symbol_) Ownable(initialOwner_) {
        require(bytes(name_).length > 0, "Token: El nombre no puede estar vacio");
        require(bytes(symbol_).length > 0, "Token: El simbolo no puede estar vacio");
        require(initialOwner_ != address(0), "Token: Direccion de owner invalida");
        require(decimals_ <= 18, "Token: Decimales maximos permitidos son 18");

        _decimals = decimals_;
        canBurn = canBurn_;
        canMint = canMint_;

        if (initialSupply_ > 0) {
            uint256 scaledSupply = initialSupply_ * (10 ** uint256(decimals_));
            _mint(initialOwner_, scaledSupply);
        }

        emit TokenCreated(
            initialOwner_,
            name_,
            symbol_,
            decimals_,
            initialSupply_,
            canBurn_,
            canMint_
        );
    }

    /**
     * @dev Retorna el número de decimales configurado para el token.
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Permite a cualquier poseedor de tokens quemar una cantidad de sus propios tokens.
     * Solo está disponible si la opción 'canBurn' fue habilitada en el despliegue.
     * @param amount Cantidad en unidades mínimas (con decimales aplicados)
     */
    function burn(uint256 amount) public virtual {
        require(canBurn, "Token: La quema de tokens no esta habilitada en este contrato");
        _burn(_msgSender(), amount);
        emit TokensBurned(_msgSender(), amount);
    }

    /**
     * @dev Permite quemar tokens de otra cuenta mediante autorización previa (allowance).
     * @param account Dirección de la cual se deducirán los tokens
     * @param amount Cantidad en unidades mínimas a quemar
     */
    function burnFrom(address account, uint256 amount) public virtual {
        require(canBurn, "Token: La quema de tokens no esta habilitada en este contrato");
        _spendAllowance(account, _msgSender(), amount);
        _burn(account, amount);
        emit TokensBurned(account, amount);
    }

    /**
     * @dev Permite al propietario acuñar nuevos tokens adicionales.
     * Solo está disponible si la opción 'canMint' fue habilitada en el despliegue.
     * @param to Dirección que recibirá los nuevos tokens
     * @param amount Cantidad en unidades mínimas a emitir
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(canMint, "Token: La emision de tokens no esta habilitada en este contrato");
        require(to != address(0), "Token: No se puede emitir a la direccion cero");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
}
